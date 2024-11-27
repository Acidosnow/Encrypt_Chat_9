const socket = io();

const form = document.getElementById("form");
const input = document.getElementById("chat-input");
const messages = document.getElementById("messages");

// 채팅창에 메세지 입력 이벤트 생성
form.addEventListener("submit", (e) => {
  e.preventDefault(); // 새로고침 방지
  if (input.value) {
    // 메세지가 입력되면 소켓에 이벤트 송신
    socket.emit("chat message", input.value);
    input.value = "";
  }
});

// 클라이언트(소켓) 이벤트 수신
socket.on("chat message", (msg) => {
  // 새로운 채팅 로그 생성
  const item = document.createElement("li");
  item.textContent = msg;
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
});
