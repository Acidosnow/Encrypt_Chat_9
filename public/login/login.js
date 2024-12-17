// 로그인 창 기능 구현
const socket = io();

const userid = document.getElementById("userid");
const userpw = document.getElementById("userpw");
const login_btn = document.getElementById("login-btn");

login_btn.addEventListener("click", (e) => {
    e.preventDefault();
    socket.emit("login", userid.value, userpw.value);
});

// 로그인 응답 수신
socket.on("login_response", (data) => {
    if (data.success) {
        window.location.href = "/home.html"; // 로그인 성공 시 이동
    } else {
        alert("로그인 실패: 사용자 이름 또는 비밀번호가 잘못되었습니다.");
    }
});
