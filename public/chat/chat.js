const socket = io();

// 초기 UI 설정
const roomContainer = document.getElementById("roomContainer");
const chatContainer = document.getElementById("chatContainer");
const createRoomButton = document.getElementById("createRoomButton");
const roomList = document.getElementById("roomList");
const currentRoomName = document.getElementById("currentRoomName");
const leaveRoomButton = document.getElementById("leaveRoomButton");
const loadingSpinner = document.getElementById("loadingSpinner");

const form = document.getElementById("messageForm");
const input = document.getElementById("messageInput");
const chat = document.getElementById("chat");

let currentRoom = "";

// 사용자 이름 설정
let username = "";
while (!username) {
  username = prompt("사용자 이름을 입력하세요:");
  if (username) {
    console.log(`사용자 이름 설정: ${username}`);
  }
}

// 방 생성 버튼 클릭 시
createRoomButton.addEventListener("click", () => {
  const room = prompt("생성할 채팅방 이름을 입력하세요:");
  if (room) {
    joinRoom(room);
    // 서버에 방 생성 및 참여 요청
    socket.emit("set username", { username: username, room: room });
  }
});

// 방 목록 클릭 시 해당 방에 참여
roomList.addEventListener("click", (e) => {
  if (e.target && e.target.nodeName === "LI") {
    const room = e.target.getAttribute("data-room");
    if (room) {
      joinRoom(room);
      socket.emit("set username", { username: username, room: room });
    }
  }
});

// 방에 참여하는 함수
function joinRoom(room) {
  currentRoom = room;
  currentRoomName.textContent = `채팅방: ${room}`;
  chat.innerHTML = ""; // 기존 채팅 내용 초기화
  roomContainer.classList.remove("active");
  chatContainer.classList.add("active");

  socket.emit("join room", room);
}

// 방을 떠나는 함수
function leaveRoom() {
  if (currentRoom) {
    socket.emit("leave room");
    currentRoom = "";
    currentRoomName.textContent = "";
    chat.innerHTML = "";
    roomContainer.classList.add("active");
    chatContainer.classList.remove("active");
  }
}

// 방 떠나기 버튼 클릭 시
leaveRoomButton.addEventListener("click", () => {
  const confirmLeave = confirm("정말로 채팅방을 나가시겠습니까?");
  if (confirmLeave) {
    leaveRoom();
  }
});

// 방 목록을 서버에서 받아오기 위한 함수
function fetchRoomList() {
  fetch("/rooms")
    .then((response) => response.json())
    .then((rooms) => {
      roomList.innerHTML = ""; // 기존 목록 초기화
      rooms.forEach((room) => {
        const li = document.createElement("li");
        li.setAttribute("data-room", room);
        li.textContent = room;
        roomList.appendChild(li);
      });
    })
    .catch((error) => {
      console.error("방 목록 가져오기 오류:", error);
      loadingSpinner.textContent = "방 목록을 불러오는 데 실패했습니다.";
    });
}

// 방 목록 초기 로드
window.addEventListener("load", () => {
  fetchRoomList();
});

// 메시지 전송
form.addEventListener("submit", function (e) {
  e.preventDefault();
  const message = input.value.trim();
  if (message) {
    console.log(`보낼 메시지: ${message} in room ${currentRoom}`);
    socket.emit("chat message", message);
    input.value = "";
  }
});

// 메시지 수신
socket.on("chat message", function (data) {
  console.log("수신한 chat message 데이터:", data);
  const item = document.createElement("li");

  // 시스템 메시지인지 사용자 메시지인지 구분
  if (data.user === "System") {
    item.classList.add("notification");
    item.textContent = data.message;
  } else {
    if (data.user === username) {
      item.classList.add("message-right");
      item.innerHTML = `
                        <div class="message-content">
                            <strong>나:</strong> ${data.message}
                        </div>
                        <div class="timestamp">${data.time}</div>
                    `;
    } else {
      item.classList.add("message-left");
      item.innerHTML = `
                        <div class="message-content">
                            <strong style="color: ${data.color};">${data.user}:</strong> ${data.message}
                        </div>
                        <div class="timestamp">${data.time}</div>
                    `;
    }
  }

  chat.appendChild(item);
  chat.scrollTop = chat.scrollHeight;
});

// 새로운 사용자가 참여했을 때 알림
socket.on("user joined", function (data) {
  console.log("수신한 user joined 데이터:", data);
  const item = document.createElement("li");
  item.classList.add("notification");
  item.textContent = `${data.user}님이 채팅에 참여했습니다.`;
  chat.appendChild(item);
  chat.scrollTop = chat.scrollHeight;
});

// 사용자가 떠났을 때 알림
socket.on("user left", function (data) {
  console.log("수신한 user left 데이터:", data);
  const item = document.createElement("li");
  item.classList.add("notification");
  item.textContent = `${data.user}님이 채팅을 떠났습니다.`;
  chat.appendChild(item);
  chat.scrollTop = chat.scrollHeight;
});

// 새로운 방이 추가되었을 때 목록 업데이트
socket.on("new room", function (room) {
  console.log("새로운 방이 생성되었습니다:", room);
  const li = document.createElement("li");
  li.setAttribute("data-room", room);
  li.textContent = room;
  roomList.appendChild(li);
});
