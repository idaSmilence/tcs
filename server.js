const WebSocket = require('ws');
const http = require('http');
const express = require('express');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 服务静态文件
app.use(express.static('.'));

// 存储所有连接的玩家
const players = new Map();
const MAX_PLAYERS = 10;

// 生成玩家ID (A-J)
function generatePlayerId() {
    const takenIds = Array.from(players.values()).map(p => p.id);
    for (let i = 65; i < 75; i++) { // ASCII码 A-J
        const id = String.fromCharCode(i);
        if (!takenIds.includes(id)) {
            return id;
        }
    }
    return null;
}

// 广播消息给所有玩家
function broadcast(message, exclude = null) {
    players.forEach((player, ws) => {
        if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    });
}

wss.on('connection', (ws) => {
    // 如果玩家数量已达上限，拒绝连接
    if (players.size >= MAX_PLAYERS) {
        ws.send(JSON.stringify({
            type: 'error',
            message: '游戏人数已满（10人），请稍后再试'
        }));
        ws.close();
        return;
    }

    // 分配玩家ID
    const playerId = generatePlayerId();
    if (!playerId) {
        ws.send(JSON.stringify({
            type: 'error',
            message: '无法分配玩家ID'
        }));
        ws.close();
        return;
    }

    // 存储玩家信息
    players.set(ws, {
        id: playerId,
        score: 0,
        position: null,
        direction: 'right'
    });

    // 发送玩家ID和当前游戏状态
    ws.send(JSON.stringify({
        type: 'init',
        playerId: playerId,
        players: Array.from(players.values())
    }));

    // 广播新玩家加入
    broadcast({
        type: 'playerJoin',
        player: players.get(ws)
    }, ws);

    // 处理消息
    ws.on('message', (message) => {
        const data = JSON.parse(message);
        const player = players.get(ws);

        switch (data.type) {
            case 'position':
                // 更新玩家位置
                player.position = data.position;
                player.direction = data.direction;
                broadcast({
                    type: 'playerMove',
                    playerId: player.id,
                    position: data.position,
                    direction: data.direction
                });
                break;

            case 'score':
                // 更新玩家分数
                player.score = data.score;
                broadcast({
                    type: 'scoreUpdate',
                    playerId: player.id,
                    score: data.score
                });
                break;

            case 'gameOver':
                // 处理玩家游戏结束
                broadcast({
                    type: 'playerGameOver',
                    playerId: player.id,
                    finalScore: data.score
                });
                break;
        }
    });

    // 处理断开连接
    ws.on('close', () => {
        const player = players.get(ws);
        if (player) {
            broadcast({
                type: 'playerLeave',
                playerId: player.id
            });
            players.delete(ws);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
}); 