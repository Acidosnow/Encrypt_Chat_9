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

let CurrentKey = ""; //현재 키 값을 저장할 변수
// DOM 요소 참조
const secretKeyInput = document.getElementById("secretKey");
const dataToEncryptInput = document.getElementById("dataToEncrypt");
const encryptedResultDisplay = document.getElementById("encryptedResult");
const dataToDecryptInput = document.getElementById("dataToDecrypt");
const decryptedResultDisplay = document.getElementById("decryptedResult");

// room 토큰 생성 함수
function generateRoomToken() {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

async function fetchUserInfo() {
  try {
    const response = await fetch("/check-login", { credentials: "include" });
    const data = await response.json();
    if (data.loggedIn) {
      console.log("로그인 중입니다.");
      //console.log(data);
      const userid = data.user.userId;
      const username = data.user.username;
      return { userid, username };
    } else {
      console.log("로그아웃 상태입니다.");
      return null;
    }
  } catch (error) {
    console.error("사용자 정보 가져오기 오류", error);
    return null;
  }
}

let userid, username;
async function setUserdata() {
  const userData = await fetchUserInfo();
  //console.log(userData);
  if (userData) {
    userid = userData.userid;
    username = userData.username;
    //console.log(userid, username);
  }
}

// 사용자 이름 설정
setUserdata();

function checkRoomname(roomname) {
  return new Promise((resolve, reject) => {
    console.log("111231231232");
    socket.emit("duplicate roomname", roomname, (response) => {
      console.log(response);
      if (response.success) {
        resolve(true);
      } else {
        reject(response.message);
      }
    });
  });
}

// 방 생성 버튼 클릭 시
createRoomButton.addEventListener("click", async () => {
  const room = prompt("생성할 채팅방 이름을 입력하세요:");
  if (room) {
    try {
      const flag = await checkRoomname(room);

      if (flag) {
        const token = generateRoomToken();
        socket.emit(
          "create room",
          {
            userId: userid,
            roomname: room,
            token: token,
          },
          (response) => {
            if (response.success) {
              joinRoom(room);
            } else {
              alert(response.message);
            }
          }
        );
      }
    } catch (errorMessage) {
      alert(errorMessage);
    }
  }
});

// 방 목록 클릭 시 해당 방에 참여
roomList.addEventListener("click", (e) => {
  if (e.target && e.target.nodeName === "LI") {
    const room = e.target.getAttribute("data-room");
    if (room) {
      joinRoom(room);
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

  socket.emit("join room", room, userid, username);
}

// 방을 떠나는 함수
function leaveRoom() {
  if (currentRoom) {
    socket.emit("leave room", currentRoom, username);
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
    fetchRoomList();
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
    socket.emit("chat message", message, username, currentRoom);
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
                            <strong>${data.user}:</strong> ${data.message}
                        </div>
                        <div class="timestamp">${data.time}</div>
                    `;
    }
  }

  chat.appendChild(item);
  chat.scrollTop = chat.scrollHeight;
});

function formatToKoreanTime(timestamp) {
  // ISO 형식으로 변환
  const utcDate = new Date(timestamp.replace(" ", "T")); // 'Z'를 추가하여 UTC로 간주
  console.log(utcDate);
  // UTC에서 로컬 시간으로 변환
  const localDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000); // 한국 시간 (UTC+9)
  console.log(localDate);
  const hours = localDate.getHours();
  const minutes = localDate.getMinutes().toString().padStart(2, "0");

  const period = hours >= 12 ? "오후" : "오전";
  const formattedHours = hours % 12 || 12; // 12시간제로 변환, 0시를 12로 표시

  return `${period} ${formattedHours}:${minutes}`;
}

// 이전 채팅 로그 로드
socket.on("load previous messages", (logs) => {
  logs.forEach((log) => {
    const item = document.createElement("li");
    console.log(log.timestamp);
    const localTime = formatToKoreanTime(log.timestamp);

    if (log.username === username) {
      item.classList.add("message-right");
      item.innerHTML = `
      <div class="message-content">
        <strong>나:</strong> ${log.message}
      </div>
      <div class="timestamp">${localTime}</div>
    `;
    } else {
      item.classList.add("message-left");
      item.innerHTML = `
      <div class="message-content">
        <strong>${log.username}:</strong> ${log.message}
      </div>
      <div class="timestamp">${localTime}</div>
    `;
    }
    chat.appendChild(item);
  });
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

// 암호화 처리 함수
document
  .getElementById("encryptButton")
  .addEventListener("click", handleEncryption);
function handleEncryption() {
  CurrentKey = secretKeyInput.value;
  const secretKey = secretKeyInput.value;
  const dataToEncrypt = dataToEncryptInput.value;

  if (!secretKey || !dataToEncrypt) {
    alert("비밀 키와 암호화할 데이터를 입력하세요.");
    return;
  }

  const encryptedData = CryptoJS.AES.encrypt(
    CryptoJS.enc.Utf8.parse(dataToEncrypt),
    secretKey,
    {
      mode: CryptoJS.mode.ECB,
      padding: CryptoJS.pad.Pkcs7,
    }
  );
  const encryptedText = encryptedData.toString();
  socket.emit("chat message", encryptedText, username, currentRoom);
  secretKeyInput.value = "";
  dataToEncryptInput.value = "";
}

// 복호화 처리 함수
socket.on("password verification result", function (isValid) {
  if (isValid.success) {
    const secretKey = CurrentKey;
    const encryptedData = dataToDecryptInput.value;
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(encryptedData, secretKey, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7,
      });

      // 복호화된 바이트를 UTF-8 문자열로 변환
      const decryptedText = decryptedBytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedText) throw new Error("복호화 실패");
      decryptedResultDisplay.textContent = "복호화 결과: " + decryptedText;
    } catch (e) {
      decryptedResultDisplay.textContent = e.message;
    }
  } else {
    decryptedResultDisplay.textContent = "비밀번호가 올바르지 않습니다.";
  }
});

// 복호화 함수
function handleDecryption() {
  const checkid = prompt("아이디를 입력하세요:");
  const checkpw = prompt("비밀번호를 입력하세요:"); // 비밀번호 입력 창 추가
  if (!checkid || !checkpw) {
    decryptedResultDisplay.textContent =
      "아이디/비밀번호가 입력되지 않았습니다.";
    return; // 아이디 또는 비밀번호가 입력되지 않으면 함수 종료
  }
  // 서버에 비밀번호 검증 요청
  socket.emit("verify password", checkid, checkpw);
}

// 이벤트 리스너 설정
document
  .getElementById("decryptButton")
  .addEventListener("click", handleDecryption);
