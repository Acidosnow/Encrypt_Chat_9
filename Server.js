// 라이브러리
const express = require("express");
const path = require("path");
const { Server } = require("socket.io");
const { createServer } = require("node:http");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

const app = express();
const server = createServer(app);
const io = new Server(server);

// 정적 파일 제공
app.use(express.static(path.join(__dirname, "public")));

// db 파일 연결
let sql;
// 사용자 정보 저장을 위한 객체
const users = {};
const userColors = {};
const chatRooms = new Set(['방1', '방2', '방3']);

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
  return hasLowerCase && hasNumber && hasSpecialChar && isLongEnough
};

// 테이블 생성 (존재하지 않을 시)
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

// 모든 사용자 조회 API http://localhost:3000/api/users 접속
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
  res.sendFile(path.join(__dirname, "public", "login", "login.html"));
});

// HTML에서 /public/chat/chat.html 을 요청
app.get("/public/chat/chat.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "chat", "chat.html"));
});

// HTML에서 /public/login/login.html 을 요청
app.get("/public/login/login.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login", "login.html"));
});

// HTML에서 /public/login/register.html 을 요청
app.get("/public/login/register.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login", "register.html"));
});

// HTML에서 /public/login/delete.html 을 요청
app.get("/public/login/delete.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login", "delete.html"));
});

function getRandomColor() {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

// Server 측 이벤트 수신
io.on("connection", (socket) => {
  // Client(socket)이 연결됨
  console.log("Client connected: " + socket.id);

  // 사용자 이름 설정 및 방 참여
  socket.on('set username', (data) => {
    const { username, room } = data;
    users[socket.id] = username;
    userColors[socket.id] = getRandomColor();
    socket.join(room);
    socket.room = room;
    socket.to(room).emit('user joined', { user: username });
    if (!chatRooms.has(room)) {
      chatRooms.add(room);
      io.emit('new room', room);
    }
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
  // 방 목록을 클라이언트에게 제공하는 라우트
  app.get('/rooms', (req, res) => {
    res.json(Array.from(chatRooms));
  });
  
  // chat message 이벤트 수신
  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
    console.log("message: " + msg);
  });

  //복호화시 비밀번호 검증
  socket.on('verify password', (userid, userpw) => {
    const sql = `SELECT * FROM users WHERE userid = ? OR username = ?`;
    db.get(sql, [userid, userid], (err, row) => {
        if (err) {
            console.error(err.message);
            socket.emit('password verification result', { success: false, message: "서버 오류" });
            return;
        }
        if (row && row.password === userpw) {
            // 비밀번호가 일치하는 경우
            socket.emit('password verification result', { success: true });
        } else {
            // 비밀번호가 일치하지 않거나 사용자 없음
            socket.emit('password verification result', { success: false, message: "사용자 이름 또는 비밀번호가 잘못되었습니다." });
        }
      });
  });

  // 로그인 이벤트 수신
  socket.on("login", (userid, userpw) => {
    const sql = `SELECT * FROM users WHERE userid = ? OR username = ?`;
    db.get(sql, [userid, userid], (err, row) => {
      if (err) {
        console.error(err.message);
        socket.emit("login_response", { success: false, message: "서버 오류" });
        return;
      }
      if (row && row.password === userpw) {
        // 비밀번호가 일치하는 경우
        socket.emit("login_response", { success: true });
      } else {
        // 비밀번호가 일치하지 않거나 사용자 없음
        socket.emit("login_response", { success: false, message: "사용자 이름 또는 비밀번호가 잘못되었습니다." });
      }
    });
  });

  // register 이벤트 수신 
  socket.on("register", (userid, username, userpw) => {
    // 비밀번호 유효성 검사
    if (!isValidPassword(userpw)) {
      socket.emit("register_response", { success: false, message: "비밀번호는 영어 소문자, 숫자, 특수 문자를 각각 1개 이상 총 6자리 이상 포함해야 합니다." });
      return;
    }

    // 사용자 이름 유효성 검사 (영어만 허용)
    const usernameRegex = /^[A-Za-z]+$/; // 영어 알파벳만 허용하는 정규 표현식
    if (!usernameRegex.test(username)) {
      socket.emit("register_response", { success: false, message: "사용자 이름은 영어 알파벳만 포함해야 합니다." });
      return;
    }
    // 사용자 아이디 유효성 검사 (영어와 숫자 허용)
    const useridRegex = /^[A-Za-z0-9]+$/; // 영어 알파벳와 숫자 허용하는 정규 표현식
    if (!useridRegex.test(userid)) {
      socket.emit("register_response", { success: false, message: "사용자 아이디는 영어 알파벳과 숫자만 포함해야 합니다." });
      return;
    }

    // 중복 확인
    const checkSql = `SELECT * FROM users WHERE userid = ? OR username = ?`;
    db.get(checkSql, [userid, username], (err, row) => {
      if (err) {
        console.error(err.message);
        socket.emit("register_response", { success: false, message: "서버 오류" });
        return;
      }
      if (row) {
        // 중복된 사용자 이름 또는 아이디가 있을 경우
        socket.emit("register_response", { success: false, message: "사용자 이름 또는 아이디가 이미 존재합니다." });
      } else {
        // 중복이 없을 경우
        const sql = `INSERT INTO users(username, userid, password) VALUES (?, ?, ?)`;
        db.run(sql, [username, userid, userpw], (err) => {
          if (err) {
            console.error(err.message);
            socket.emit("register_response", { success: false, message: "서버 오류" });
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
        socket.emit("delete_response", { success: false, message: "서버 오류" });
        return;
      }
      if (row && row.password === userpw) {
        // 비밀번호가 일치하는 경우
        const deleteSql = `DELETE FROM users WHERE userid = ?`;
        db.run(deleteSql, [userid], (err) => {
          if (err) {
            console.error(err.message);
            socket.emit("delete_response", { success: false, message: "서버 오류" });
          } else {
            socket.emit("delete_response", { success: true });
          }
        });
      } else {
        // 비밀번호가 일치하지 않음
        socket.emit("delete_response", { success: false, message: "비밀번호가 일치하지 않습니다." });
      }
    });
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
