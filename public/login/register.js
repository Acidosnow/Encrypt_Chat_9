// 회원가입 창 기능 구현
const socket = io();

const username = document.getElementById("username");
const userid = document.getElementById("userid");
const userpw = document.getElementById("userpw");
const register_btn = document.getElementById("register-btn");

register_btn.addEventListener("click", (e) => { // 'submit'에서 'click'으로 변경
  e.preventDefault();
  console.log("submitted");
  socket.emit("register", userid.value, username.value, userpw.value); // 값 가져오기
  console.log(username.value + " " + userid.value + " " + userpw.value);
});

const userpw_R = document.getElementById("userpw_R"); // 비밀번호 재확인 입력 필드 추가

register_btn.addEventListener("click", (e) => {
  e.preventDefault();

  // 비밀번호 확인 로직 추가
  if (userpw.value !== userpw_R.value) {
    alert("비밀번호가 일치하지 않습니다. 다시 확인해 주세요."); // 비밀번호 불일치 알림
    return; // 함수 종료
  }

  console.log("submitted");
  socket.emit("register", userid.value, username.value, userpw.value);
  console.log(username.value + " " + userid.value + " " + userpw.value);
});

// 서버 응답 수신
socket.on("register_response", (data) => {
  if (!data.success) {
    alert(data.message); // 중복된 사용자 이름 또는 아이디가 있을 경우 알림
  } else {
    alert("회원가입 성공!");
    window.location.href = "/public/login/login.html";
  }
});