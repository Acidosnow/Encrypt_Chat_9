// 회원탈퇴 기능 구현
const socket = io();

const userid = document.getElementById("userid");
const userpw = document.getElementById("userpw");
const delete_btn = document.getElementById("delete-btn");
const message = document.getElementById("message");

delete_btn.addEventListener("click", (e) => {
  e.preventDefault();
  socket.emit("delete_account", userid.value, userpw.value);
});

// 서버 응답 수신
socket.on("delete_response", (data) => {
  if (data.success) {
    message.textContent = "회원탈퇴가 완료되었습니다.";
    setTimeout(() => {
      window.location.href = "/login"; // 로그인 페이지로 이동
    }, 2000);
  } else {
    message.textContent = data.message; // 오류 메시지 표시
  }
});
