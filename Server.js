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

const db = new sqlite3.Database(
  "./public/db/temp.db",
  sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE,
  (err) => {
    if (err) return console.error(err.message);
  }
);

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

// localhost:3000/ 으로 접속할 경우
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login", "login.html"));
});

// HTML에서 /public/chat/chat.html 을 요청
app.get("/public/chat/chat.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "chat", "chat.html"));
});

// HTML에서 /public/login/register.html 을 요청
app.get("/public/login/register.html", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login", "register.html"));
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

  // register 이벤트 수신 (미구현)
  socket.on("register", (userid, username, userpw) => {
    console.log(username + " " + userid + " " + userpw);
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
