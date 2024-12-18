// 라이브러리
const express = require("express");
const path = require("path");
const { Server } = require("socket.io");
const { createServer } = require("node:http");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const cookieParser = require("cookie-parser");

const app = express();
const server = createServer(app);
const io = new Server(server);

const activeSessions = {}; // 세션 저장 변수
const activeUsers = {}; // 로그인된 유저 관리

// 쿠키 사용 파일
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 세션 토큰 생성 함수
function generateSessionToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

// 쿠키 검증
function authenticate(req, res, next) {
  const token = req.cookies.authToken;
  if (!token || !activeSessions[token]) {
    return res.redirect("/login");
  }

  // 사용자 정보 추가
  req.user = activeSessions[token];
  next();
}

app.post("/login", (req, res) => {
  const { userid, userpw } = req.body;
  const sql = `SELECT * FROM users WHERE userid = ?`;

  db.get(sql, [userid], (err, row) => {
    if (err) {
      console.error(err.message);
      res.status(500).json({ success: false, message: "서버 오류" });
      return;
    }

    if (row && row.password === userpw) {
      const sessionToken = generateSessionToken();

      res.cookie("authToken", sessionToken, {
        httpOnly: true,
        secure: false,
        sameSite: "lax",
        maxAge: 3600000,
      });

      activeSessions[sessionToken] = { userId: row.id, username: row.username };
      activeUsers[row.username] = { id: row.id, username: row.username };

      io.emit("updateUsers", Object.values(activeUsers)); // 모든 클라이언트에 전송

      res.json({ success: true });
    } else {
      res.status(401).json({
        success: false,
        message: "아이디 또는 비밀번호가 잘못되었습니다.",
      });
    }
  });
});

app.post("/logout", (req, res) => {
  //console.log("쿠키 : ", req.cookies);

  const token = req.cookies.authToken;

  if (token && activeSessions[token]) {
    const username = activeSessions[token].username;

    delete activeSessions[token];
    delete activeUsers[username];

    io.emit("updateUsers", Object.values(activeUsers));
  }

  res.clearCookie("authToken", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });

  res.json({ success: true, message: "로그아웃 되었습니다." });
});

// 클라이언트 로그인 상태 확인
app.get("/check-login", (req, res) => {
  //console.log("쿠키 : ", req.cookies);

  const token = req.cookies.authToken;
  if (!token || !activeSessions[token]) {
    return res.json({ loggedIn: false });
  }

  res.json({ loggedIn: true, user: activeSessions[token] });
});

// 유저 로그인 상태 확인
app.get("/check-login/:userid", (req, res) => {
  const { userid } = req.params;

  const session = Object.values(activeSessions).find(
    (session) => session.userId === parseInt(userid)
  );

  if (session) {
    res.json({ loggedIn: true, username: session.username });
  } else {
    res.json({ loggedIn: false });
  }
});

// 정적 파일 제공
app.use(express.static(path.join(__dirname, "public")));

// db 파일 연결
let sql;

const db = new sqlite3.Database(
  "./public/db/temp.db",
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) return console.error(err.message);
  }
);

// 비밀번호 유효성 검사 함수
const isValidPassword = (password) => {
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const isLongEnough = password.length >= 6; // 6자리 이상인지 확인
  return hasLowerCase && hasNumber && hasSpecialChar && isLongEnough;
};

// 방 목록 테이블 생성
sql = `CREATE TABLE IF NOT EXISTS rooms(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  creator_id INTEGER,
  FOREIGN KEY (creator_id) REFERENCES users(id)
)`;

db.run(sql, (err) => {
  if (err) return console.error(err.message);
});

sql = `CREATE TABLE IF NOT EXISTS user_rooms(
  user_id INTEGER,
  room_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (room_id) REFERENCES rooms(id),
  PRIMARY KEY (user_id, room_id)
)`;

db.run(sql, (err) => {
  if (err) return console.error(err.message);
});

// 채팅방 목록 요청 응답
app.get("/rooms", authenticate, (req, res) => {
  sql = `SELECT name FROM rooms`;
  db.all(sql, [], (err, rows) => {
    if (err)
      return res.status(500).json({ error: "방 목록을 불러오지 못했습니다." });

    const roomNames = rows.map((row) => row.name);
    res.json(roomNames);
  });
});

// 유저 테이블 생성 (존재하지 않을 시)
sql = `CREATE TABLE IF NOT EXISTS users(
  id INTEGER PRIMARY KEY,
  username TEXT,
  userid TEXT UNIQUE,
  password TEXT
  )`;

// DB 값 예시 삽입
db.run(sql, (err) => {
  // 삽입
  sql = `INSERT OR IGNORE INTO users(username, userid, password) VALUES (?,?,?)`;
  db.run(sql, ["admin", "adminid", "adminpw"], (err) => {
    if (err) return console.error(err.message);
  });
});

// 모든 사용자 조회 API http://localhost:3000/api/users
app.get("/api/users", (req, res) => {
  const sql = `SELECT * FROM users`;
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// localhost:3000/ 으로 접속할 경우
app.get("/", (req, res) => {
  console.log("to login");
  res.sendFile(path.join(__dirname, "public", "login", "login.html"));
});

// HTML에서 /chat 을 요청
app.get("/chat", authenticate, (req, res) => {
  console.log("to chat");
  res.sendFile(path.join(__dirname, "public", "chat", "chat.html"));
});

// HTML에서 /login 을 요청
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login", "login.html"));
});

// HTML에서 /login-register 을 요청
app.get("/login-register", (req, res) => {
  console.log("to register");
  res.sendFile(path.join(__dirname, "public", "login", "register.html"));
});

// HTML에서 /login-delete 을 요청
app.get("/login-delete", (req, res) => {
  console.log("to delete");
  res.sendFile(path.join(__dirname, "public", "login", "delete.html"));
});

// HTML에서 /home 을 요청
app.get("/home", authenticate, (req, res) => {
  console.log("to home");
  console.log(activeSessions);
  res.sendFile(path.join(__dirname, "public", "home", "home.html"));
});

// Server 측 이벤트 수신
io.on("connection", (socket) => {
  // Client(socket)이 연결됨
  console.log("Client connected: " + socket.id);

  // chat message 이벤트 수신
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
    console.log("message: " + msg);
  });

  // 회원가입 이벤트 수신
  socket.on("register", (userid, username, userpw) => {
    // 비밀번호 유효성 검사
    if (!isValidPassword(userpw)) {
      socket.emit("register_response", {
        success: false,
        message:
          "비밀번호는 영어 소문자, 숫자, 특수 문자를 각각 1개 이상 총 6자리 이상 포함해야 합니다.",
      });
      return;
    }

    // 사용자 이름 유효성 검사 (영어만 허용)
    const usernameRegex = /^[A-Za-z]+$/; // 영어 알파벳만 허용하는 정규 표현식
    const useridRegex = /^[A-Za-z0-9]+$/; // 영어 알파벳와 숫자 허용하는 정규 표현식
    if (!usernameRegex.test(username)) {
      socket.emit("register_response", {
        success: false,
        message: "사용자 이름은 영어 알파벳만 포함해야 합니다.",
      });
      return;
    }
    // 사용자 아이디 유효성 검사 (영어와 숫자 허용)
    else if (!useridRegex.test(userid)) {
      socket.emit("register_response", {
        success: false,
        message: "사용자 아이디는 영어 알파벳과 숫자만 포함해야 합니다.",
      });
      return;
    }

    // 중복 확인
    const checkSql = `SELECT * FROM users WHERE userid = ?`;
    db.get(checkSql, [userid], (err, row) => {
      if (err) {
        console.error(err.message);
        socket.emit("register_response", {
          success: false,
          message: "서버 오류",
        });
        return;
      }
      if (row) {
        // 중복된 사용자 이름 또는 아이디가 있을 경우
        socket.emit("register_response", {
          success: false,
          message: "아이디가 이미 존재합니다.",
        });
      } else {
        // 중복이 없을 경우
        const sql = `INSERT INTO users(username, userid, password) VALUES (?, ?, ?)`;
        db.run(sql, [username, userid, userpw], (err) => {
          if (err) {
            console.error(err.message);
            socket.emit("register_response", {
              success: false,
              message: "서버 오류",
            });
          } else {
            socket.emit("register_response", { success: true });
          }
        });
      }
    });
  });

  // 회원탈퇴 이벤트 수신
  socket.on("delete_account", (userid, userpw) => {
    const sql = `SELECT * FROM users WHERE userid = ?`;
    db.get(sql, [userid], (err, row) => {
      if (err) {
        console.error(err.message);
        socket.emit("delete_response", {
          success: false,
          message: "서버 오류",
        });
        return;
      }
      if (row && row.password === userpw) {
        // 비밀번호가 일치하는 경우
        const deleteSql = `DELETE FROM users WHERE userid = ?`;
        db.run(deleteSql, [userid], (err) => {
          if (err) {
            console.error(err.message);
            socket.emit("delete_response", {
              success: false,
              message: "서버 오류",
            });
          } else {
            socket.emit("delete_response", { success: true });
          }
        });
      } else {
        // 비밀번호가 일치하지 않음
        socket.emit("delete_response", {
          success: false,
          message: "비밀번호가 일치하지 않습니다.",
        });
      }
    });
  });

  // 로그인 중인 유저 목록 요청 수신
  socket.on("LoggedinUser", () => {
    socket.emit("updateUsers", Object.values(activeUsers));
  });

  // Client 연결 해제
  socket.on("disconnect", () => {
    console.log("Client disconnected: " + socket.id);
  });
});

const port = 3000;
server.listen(port, () => {
  console.log("Server is running...");
});
