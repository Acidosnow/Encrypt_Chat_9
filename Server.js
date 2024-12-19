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

// 사용자 정보 저장을 위한 객체
const users = {};
const userColors = {};

// 현재 채팅방 목록을 저장하기 위한 객체 (초기 방 목록 설정)
const chatRooms = new Set(['방1', '방2', '방3']);

// 쿠키 사용 파일
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 랜덤 색상 생성 함수
function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

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
  const sql = `SELECT name FROM rooms`;
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
  console.log("Client connected: " + socket.id);

  // 사용자 이름 설정 및 방 참여
  socket.on('set username', (data) => {
    const { username, room } = data;
    console.log(`set username 이벤트 수신: ${username} in room ${room}`);
    users[socket.id] = username;
    userColors[socket.id] = getRandomColor();

    // 사용자를 특정 룸에 참여시킴
    socket.join(room);
    socket.room = room; // 소켓 객체에 현재 룸 정보를 저장

    // 해당 룸의 다른 사용자에게 알림
    socket.to(room).emit('user joined', { user: username });

    // 방 목록 업데이트 (새로운 방 생성 시)
    if (!chatRooms.has(room)) {
      chatRooms.add(room);
      const sql = `INSERT INTO rooms (name) VALUES (?)`;
      db.run(sql, [room], (err) => {
        if (err) {
          console.error(err.message);
          return;
        }
        io.emit('new room', room); // 모든 클라이언트에게 새로운 방이 추가되었음을 알림
        io.emit("update room list", Array.from(chatRooms)); // 모든 클라이언트에게 방 목록 업데이트
      });
    }
  });

  // 새로운 방이 추가되었을 때 목록 업데이트
  socket.on("new room", function (room) {
    console.log("새로운 방이 생성되었습니다:", room);
    const sql = `INSERT INTO rooms (name) VALUES (?)`;
    db.run(sql, [room], (err) => {
      if (err) {
        console.error(err.message);
        return;
      }
      chatRooms.add(room); // 방 목록에 추가
      io.emit("new room", room); // 모든 클라이언트에게 새로운 방이 추가되었음을 알림
      io.emit("update room list", Array.from(chatRooms)); // 모든 클라이언트에게 방 목록 업데이트
    });
  });

  // 메시지 수신 시 룸 기준으로 브로드캐스트
  socket.on('chat message', (message) => {
    const username = users[socket.id] || '익명';
    const color = userColors[socket.id] || '#000000';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const messageData = {
      user: username,
      message: message,
      color: color,
      time: timestamp
    };

    console.log(`chat message 이벤트 수신: ${JSON.stringify(messageData)} in room ${socket.room}`);

    // 메시지를 소켓이 속한 룸으로 브로드캐스트
    io.to(socket.room).emit('chat message', messageData);
  });

  // 방 떠나기 요청 처리
  socket.on('leave room', () => {
    const username = users[socket.id];
    const room = socket.room;
    if (username && room) {
      socket.leave(room);
      socket.to(room).emit('user left', { user: username });
      console.log(`${username} 사용자가 방 ${room}을 떠났습니다.`);
      socket.room = null;
    }
  });

  // 연결 해제 시
  socket.on('disconnect', () => {
    const username = users[socket.id];
    const room = socket.room;
    if (username && room) {
      console.log(`${username} 사용자가 연결을 해제했습니다. (Room: ${room})`);
      // 해당 룸의 다른 사용자에게 알림
      socket.to(room).emit('user left', { user: username });
      delete users[socket.id];
      delete userColors[socket.id];
    }
  });

  // 로그인한 사용자 목록 요청 처리
  socket.on("LoggedinUser", () => {
    io.emit("updateUsers", Object.values(activeUsers)); // 현재 온라인 사용자 목록 전송
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