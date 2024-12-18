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

// 현재 채팅방 목록을 저장하기 위한 객체 (초기 방 목록 설정)
const chatRooms = new Set(['방1', '방2', '방3']);

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

    // 사용자 이름 설정 및 방 참여
    socket.on('set username', (data) => {
        const { username, room } = data;
        console.log(`set username 이벤트 수신: ${username} in room ${room}`);
        users[socket.id] = username;
        userColors[socket.id] = getRandomColor();

        // 사용자를 특정 룸에 참여시킴
        socket.join(room);
        socket.room = room; // 소켓 객체에 현재 룸 정보를 저장

        // 해당 룸의 다른 사용자에게 알림
        socket.to(room).emit('user joined', { user: username });

        // 방 목록 업데이트 (새로운 방 생성 시)
        if (!chatRooms.has(room)) {
            chatRooms.add(room);
            io.emit('new room', room); // 모든 클라이언트에게 새로운 방이 추가되었음을 알림
        }
    });

    // 메시지 수신 시 룸 기준으로 브로드캐스트
    socket.on('chat message', (message) => {
        const username = users[socket.id] || '익명';
        const color = userColors[socket.id] || '#000000';
        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const messageData = {
            user: username,
            message: message,
            color: color,
            time: timestamp
        };

        console.log(`chat message 이벤트 수신: ${JSON.stringify(messageData)} in room ${socket.room}`);

        // 메시지를 소켓이 속한 룸으로 브로드캐스트
        io.to(socket.room).emit('chat message', messageData);
    });

    // 방 떠나기 요청 처리
    socket.on('leave room', () => {
        const username = users[socket.id];
        const room = socket.room;
        if (username && room) {
            socket.leave(room);
            socket.to(room).emit('user left', { user: username });
            console.log(`${username} 사용자가 방 ${room}을 떠났습니다.`);
            socket.room = null;
        }
    });

    // 연결 해제 시
    socket.on('disconnect', () => {
        const username = users[socket.id];
        const room = socket.room;
        if (username && room) {
            console.log(`${username} 사용자가 연결을 해제했습니다. (Room: ${room})`);
            // 해당 룸의 다른 사용자에게 알림
            socket.to(room).emit('user left', { user: username });
            delete users[socket.id];
            delete userColors[socket.id];
        }
    });
});

// 방 목록을 클라이언트에게 제공하는 라우트
app.get('/rooms', (req, res) => {
    res.json(Array.from(chatRooms));
});

// 서버 시작
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
});
