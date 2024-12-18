// 홈 화면 기능 구현
const socket = io();

const logout_btn = document.getElementById("logout-btn");

logout_btn.addEventListener("click", Logout);

async function Logout() {
  try {
    const response = await fetch("/logout", {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`로그아웃 실패:${response.status}`);
    }

    const data = await response.json();
    console.log(data.message);
    alert(data.message);
    window.location.href = "/login";
  } catch (error) {
    console.error("로그아웃 요청 오류:", error);
  }
}

function updateUserList(users) {
  const userList = document.getElementById("online-user-list");
  userList.innerHTML = "";

  users.forEach((user) => {
    const li = document.createElement("li");
    li.textContent = user.username;
    userList.appendChild(li);
  });
}

socket.on("updateUsers", (users) => {
  updateUserList(users);
});

window.onload = socket.emit("LoggedinUser");
