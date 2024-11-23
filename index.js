// index.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

// Express 앱 설정
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// 정적 파일 제공 설정
app.use(express.static(__dirname + '/public'));

// 사용자 정보 저장을 위한 객체
const users = {};
const userColors = {};

// 랜덤 색상 생성 함수
function getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

io.on('connection', (socket) => {
    console.log('새 사용자가 연결되었습니다.');

    // 사용자 이름 설정
    socket.on('set username', (username) => {
        console.log(`set username 이벤트 수신: ${username}`);
        users[socket.id] = username;
        userColors[socket.id] = getRandomColor();
        console.log(`사용자 ${username}이(가) 연결되었습니다.`);
        io.emit('user joined', { user: username, color: userColors[socket.id] });
    });

    // 메시지 수신 시 브로드캐스트
    socket.on('chat message', (message) => {
        console.log(`chat message 이벤트 수신: ${message}`);
        const username = users[socket.id] || '익명';
        const color = userColors[socket.id] || '#000000';
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const messageData = {
            user: username,
            message: message,
            color: color,
            time: timestamp
        };
        console.log('브로드캐스트할 메시지 데이터:', messageData);
        io.emit('chat message', messageData);
    });

    // 연결 해제 시
    socket.on('disconnect', () => {
        const username = users[socket.id];
        if (username) {
            console.log(`${username} 사용자가 연결을 해제했습니다.`);
            io.emit('user left', username);
            delete users[socket.id];
            delete userColors[socket.id];
        }
    });
});

// 서버 시작
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
