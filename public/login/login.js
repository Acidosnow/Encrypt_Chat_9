// 로그인 창 기능 구현
const socket = io();

const userid = document.getElementById("userid");
const userpw = document.getElementById("userpw");
const login_btn = document.getElementById("login-btn");

login_btn.addEventListener("click", (e) => {
  e.preventDefault();
  Login(userid.value, userpw.value);
});

// 현재 로그인 상태 확인
async function checkLoginStatus(userid) {
  try {
    const response = await fetch("/check-login", {
      method: "GET",
      credentials: "include",
    });

    if (!response.ok) throw new Error("네트워크 오류");

    const data = await response.json();
    if (data.loggedIn) {
      console.log(`로그인 상태입니다: ${userid}`);
      window.location.href = "/home";
    } else {
      console.log("로그인 상태가 아닙니다.");
    }
  } catch (error) {
    console.error("로그인 상태 확인 오류:", error);
  }
}

// 로그인 진행
async function Login(userid, userpw) {
  const response = await fetch("/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userid, userpw }),
    credentials: "include",
  });

  const data = await response.json();

  if (data.success) {
    window.location.href = "/home";
  } else {
    alert("로그인 실패: 사용자 이름 또는 비밀번호가 잘못되었습니다.");
  }
}

// 로그인 창 진입 시 로그인 여부에 따라 홈 화면으로 이동
window.onload = checkLoginStatus;
