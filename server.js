const express = require('express');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// 静态文件服务
app.use(express.static(path.join(__dirname, '/')));

// 存储玩家信息
const players = new Map();
const gameState = {
    foods: [],
    maxFoods: 10
};

// 生成随机位置
function generateRandomPosition(gridSize) {
    return {
        x: Math.floor(Math.random() * gridSize),
        y: Math.floor(Math.random() * gridSize)
    };
}

// 检查位置是否与其他玩家或食物重叠
function isPositionOccupied(pos, gridSize) {
    // 检查是否与其他玩家重叠
    for (let [_, player] of players) {
        for (let segment of player.snake) {
            if (segment.x === pos.x && segment.y === pos.y) {
                return true;
            }
        }
    }
    
    // 检查是否与食物重叠
    for (let food of gameState.foods) {
        if (food.x === pos.x && food.y === pos.y) {
            return true;
        }
    }
    
    return false;
}

// 生成食物
function generateFood(gridSize) {
    const maxAttempts = 100; // 防止无限循环
    let attempts = 0;
    
    while (gameState.foods.length < gameState.maxFoods && attempts < maxAttempts) {
        const pos = generateRandomPosition(gridSize);
        if (!isPositionOccupied(pos, gridSize)) {
            gameState.foods.push(pos);
        }
        attempts++;
    }
}

// 广播游戏状态
function broadcastGameState() {
    const state = {
        type: 'gameState',
        players: Array.from(players.entries()).map(([id, player]) => ({
            id,
            nickname: player.nickname,
            snake: player.snake,
            score: player.score,
            direction: player.direction
        })),
        foods: gameState.foods
    };
    
    const stateStr = JSON.stringify(state);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(stateStr);
        }
    });
}

// WebSocket连接处理
wss.on('connection', (ws) => {
    console.log('New client connected');
    let playerId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received:', data);
            
            switch (data.type) {
                case 'join':
                    // 验证昵称
                    if (!data.nickname || data.nickname.length > 3) {
                        ws.send(JSON.stringify({
                            type: 'error',
                            message: '昵称不能为空且最多3个字'
                        }));
                        return;
                    }

                    // 生成玩家ID
                    playerId = Date.now().toString();
                    
                    // 创建玩家初始状态
                    const initialPos = generateRandomPosition(50); // 假设网格大小为50
                    const snake = [];
                    
                    // 使用昵称的三个字作为蛇的前三个节点
                    for (let i = 0; i < data.nickname.length; i++) {
                        snake.push({
                            x: initialPos.x,
                            y: initialPos.y + i,
                            char: data.nickname[i]
                        });
                    }
                    
                    // 如果昵称少于3个字，用空白补充
                    while (snake.length < 3) {
                        snake.push({
                            x: initialPos.x,
                            y: initialPos.y + snake.length,
                            char: ''
                        });
                    }
                    
                    players.set(playerId, {
                        nickname: data.nickname,
                        snake: snake,
                        score: 0,
                        direction: 'up',
                        ws: ws
                    });

                    // 如果是第一个玩家，生成初始食物
                    if (players.size === 1) {
                        generateFood(50);
                    }

                    console.log(`Player ${data.nickname} (${playerId}) joined`);

                    // 发送玩家ID给客户端
                    ws.send(JSON.stringify({
                        type: 'joined',
                        playerId: playerId
                    }));

                    // 广播更新后的游戏状态
                    broadcastGameState();
                    break;

                case 'move':
                    if (playerId && players.has(playerId)) {
                        const player = players.get(playerId);
                        player.direction = data.direction;
                        
                        // 更新蛇的位置
                        const head = {...player.snake[0]};
                        switch (data.direction) {
                            case 'up': head.y--; break;
                            case 'down': head.y++; break;
                            case 'left': head.x--; break;
                            case 'right': head.x++; break;
                        }
                        
                        // 检查是否吃到食物
                        const foodIndex = gameState.foods.findIndex(food => 
                            food.x === head.x && food.y === head.y);
                        
                        if (foodIndex !== -1) {
                            // 移除被吃掉的食物
                            gameState.foods.splice(foodIndex, 1);
                            // 增加分数
                            player.score += data.difficulty === 'easy' ? 1 : 
                                          data.difficulty === 'hard' ? 2 : 3;
                            // 生成新食物
                            generateFood(50);
                        } else {
                            // 如果没有吃到食物，移除尾部
                            player.snake.pop();
                        }
                        
                        // 添加新的头部
                        player.snake.unshift(head);
                        
                        // 检查碰撞
                        if (head.x < 0 || head.x >= 50 || head.y < 0 || head.y >= 50 ||
                            player.snake.slice(1).some(segment => 
                                segment.x === head.x && segment.y === head.y)) {
                            // 玩家死亡
                            ws.send(JSON.stringify({
                                type: 'dead',
                                score: player.score
                            }));
                            players.delete(playerId);
                        }
                        
                        // 广播更新后的游戏状态
                        broadcastGameState();
                    }
                    break;
            }
        } catch (error) {
            console.error('Error processing message:', error);
            ws.send(JSON.stringify({
                type: 'error',
                message: '服务器处理消息时出错'
            }));
        }
    });

    // 处理断开连接
    ws.on('close', () => {
        console.log(`Client disconnected${playerId ? ` (${playerId})` : ''}`);
        if (playerId && players.has(playerId)) {
            players.delete(playerId);
            broadcastGameState();
        }
    });

    // 处理错误
    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 