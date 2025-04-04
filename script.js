/**
 * 贪食蛇游戏类
 * 实现了基本的游戏逻辑、碰撞检测、分数记录和排行榜功能
 */
class SnakeGame {
    /**
     * 初始化游戏
     * 设置画布、加载资源、初始化游戏参数
     */
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.gridSize = 50;
        this.cellSize = 12;
        this.playerId = null;
        this.players = new Map();
        this.foods = [];
        this.direction = 'up';
        this.isGameStarted = false;
        this.difficulty = 'easy';
        this.ws = null;
        this.wsConnected = false;

        // 设置画布大小
        this.canvas.width = this.gridSize * this.cellSize;
        this.canvas.height = this.gridSize * this.cellSize;

        // 初始化UI元素
        this.nicknamePanel = document.getElementById('nickname-panel');
        this.nicknameInput = document.getElementById('nickname');
        this.nicknameError = document.getElementById('nickname-error');
        this.joinButton = document.getElementById('join-game');
        this.difficultySelect = document.getElementById('difficulty');

        // 绑定事件处理器
        this.bindEvents();
        this.setupWebSocket();
    }

    bindEvents() {
        // 昵称输入验证
        this.nicknameInput.addEventListener('input', () => {
            const nickname = this.nicknameInput.value;
            if (nickname.length > 3) {
                this.nicknameError.textContent = '昵称最多3个字';
                this.joinButton.disabled = true;
            } else if (nickname.length === 0) {
                this.nicknameError.textContent = '请输入昵称';
                this.joinButton.disabled = true;
            } else {
                this.nicknameError.textContent = '';
                this.joinButton.disabled = false;
            }
        });

        // 加入游戏按钮
        this.joinButton.addEventListener('click', () => {
            if (!this.wsConnected) {
                this.nicknameError.textContent = '正在连接服务器，请稍候...';
                return;
            }
            
            const nickname = this.nicknameInput.value;
            if (nickname && nickname.length <= 3) {
                this.ws.send(JSON.stringify({
                    type: 'join',
                    nickname: nickname
                }));
            }
        });

        // 难度选择
        this.difficultySelect.addEventListener('change', (e) => {
            this.difficulty = e.target.value;
        });

        // 键盘控制
        document.addEventListener('keydown', (e) => {
            if (!this.isGameStarted) return;

            let newDirection = this.direction;
            switch (e.key) {
                case 'ArrowUp': newDirection = 'up'; break;
                case 'ArrowDown': newDirection = 'down'; break;
                case 'ArrowLeft': newDirection = 'left'; break;
                case 'ArrowRight': newDirection = 'right'; break;
            }

            if (this.isValidDirectionChange(this.direction, newDirection)) {
                this.direction = newDirection;
                this.sendMove();
            }
        });

        // 触摸控制
        const touchButtons = ['upBtn', 'downBtn', 'leftBtn', 'rightBtn'];
        touchButtons.forEach(btnId => {
            const button = document.getElementById(btnId);
            if (button) {
                button.addEventListener('click', () => {
                    if (!this.isGameStarted) return;

                    const newDirection = btnId.replace('Btn', '');
                    if (this.isValidDirectionChange(this.direction, newDirection)) {
                        this.direction = newDirection;
                        this.sendMove();
                    }
                });
            }
        });
    }

    setupWebSocket() {
        // 使用当前页面的主机名和端口号
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname || 'localhost';
        const port = window.location.port || '3000';
        const wsUrl = `${protocol}//${host}:${port}`;

        console.log('Connecting to WebSocket server at:', wsUrl);
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
            console.log('WebSocket connection established');
            this.wsConnected = true;
            this.nicknameError.textContent = '';
            this.joinButton.disabled = false;
        };

        this.ws.onclose = () => {
            console.log('WebSocket connection closed');
            this.wsConnected = false;
            this.isGameStarted = false;
            this.nicknamePanel.classList.remove('hidden');
            this.nicknameError.textContent = '与服务器的连接已断开，请刷新页面重试';
            this.joinButton.disabled = true;
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.wsConnected = false;
            this.nicknameError.textContent = '连接服务器失败，请刷新页面重试';
            this.joinButton.disabled = true;
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                console.log('Received message:', data);
                
                switch (data.type) {
                    case 'joined':
                        this.playerId = data.playerId;
                        this.isGameStarted = true;
                        this.nicknamePanel.classList.add('hidden');
                        this.startGameLoop();
                        break;

                    case 'gameState':
                        this.players = new Map(data.players.map(p => [p.id, p]));
                        this.foods = data.foods;
                        this.updateLeaderboard();
                        break;

                    case 'dead':
                        alert(`游戏结束！你的得分：${data.score}`);
                        this.isGameStarted = false;
                        this.nicknamePanel.classList.remove('hidden');
                        break;

                    case 'error':
                        this.nicknameError.textContent = data.message;
                        break;
                }
            } catch (error) {
                console.error('Error parsing message:', error);
            }
        };
    }

    isValidDirectionChange(oldDir, newDir) {
        if (oldDir === 'up' && newDir === 'down') return false;
        if (oldDir === 'down' && newDir === 'up') return false;
        if (oldDir === 'left' && newDir === 'right') return false;
        if (oldDir === 'right' && newDir === 'left') return false;
        return true;
    }

    sendMove() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'move',
                direction: this.direction,
                difficulty: this.difficulty
            }));
        }
    }

    startGameLoop() {
        const gameLoop = () => {
            if (!this.isGameStarted) return;
            this.draw();
            requestAnimationFrame(gameLoop);
        };
        gameLoop();
    }

    draw() {
        // 清空画布
        this.ctx.fillStyle = '#f0f0f0';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制网格
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 0.5;
        for (let i = 0; i <= this.gridSize; i++) {
            this.ctx.beginPath();
            this.ctx.moveTo(i * this.cellSize, 0);
            this.ctx.lineTo(i * this.cellSize, this.canvas.height);
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(0, i * this.cellSize);
            this.ctx.lineTo(this.canvas.width, i * this.cellSize);
            this.ctx.stroke();
        }

        // 绘制食物
        this.foods.forEach(food => {
            this.ctx.fillStyle = '#ff9800';
            this.ctx.beginPath();
            this.ctx.arc(
                (food.x + 0.5) * this.cellSize,
                (food.y + 0.5) * this.cellSize,
                this.cellSize / 2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        });

        // 绘制所有玩家的蛇
        this.players.forEach(player => {
            const isCurrentPlayer = player.id === this.playerId;
            
            // 绘制蛇身
            player.snake.forEach((segment, index) => {
                // 设置颜色
                this.ctx.fillStyle = isCurrentPlayer ? '#4CAF50' : '#9E9E9E';
                
                // 绘制蛇身节点
                this.ctx.beginPath();
                this.ctx.arc(
                    (segment.x + 0.5) * this.cellSize,
                    (segment.y + 0.5) * this.cellSize,
                    this.cellSize / 2,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();

                // 绘制字符
                if (segment.char) {
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = `${this.cellSize * 0.8}px Arial`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText(
                        segment.char,
                        (segment.x + 0.5) * this.cellSize,
                        (segment.y + 0.5) * this.cellSize
                    );
                }
            });
        });
    }

    updateLeaderboard() {
        const leaderboardList = document.getElementById('leaderboard-list');
        const onlinePlayersList = document.getElementById('online-players-list');
        
        // 清空现有内容
        leaderboardList.innerHTML = '';
        onlinePlayersList.innerHTML = '';
        
        // 转换为数组并排序
        const playerArray = Array.from(this.players.values())
            .sort((a, b) => b.score - a.score);
        
        // 更新排行榜
        playerArray.forEach((player, index) => {
            const isCurrentPlayer = player.id === this.playerId;
            const item = document.createElement('div');
            item.className = `leaderboard-item${isCurrentPlayer ? ' current-player' : ''}`;
            item.innerHTML = `
                <span class="rank">#${index + 1}</span>
                <span class="name">${player.nickname}</span>
                <span class="score">${player.score}</span>
            `;
            leaderboardList.appendChild(item);
        });
        
        // 更新在线玩家列表
        playerArray.forEach(player => {
            const isCurrentPlayer = player.id === this.playerId;
            const item = document.createElement('div');
            item.className = `player-item${isCurrentPlayer ? ' current-player' : ''}`;
            item.innerHTML = `
                <span class="player-name">${player.nickname}</span>
                <span class="player-status">${isCurrentPlayer ? '(我)' : ''}</span>
            `;
            onlinePlayersList.appendChild(item);
        });
    }
}

// 启动游戏
window.onload = () => {
    new SnakeGame();
}; 