// 회원가입 창 기능 구현
const socket = io();

// 미구현
const username = document.getElementById("username").innerText;
const userid = document.getElementById("userid");
const userpw = document.getElementById("userpw");
const register_btn = document.getElementById("register-btn");

register_btn.addEventListener("submit", (e) => {
  e.preventDefault();
  console.log("submitted");
  socket.emit("register", username, userid, userpw);
  console.log(username + " " + userid + " " + userpw);
});
