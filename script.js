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
        // 初始化画布
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 600;
        this.canvas.height = 600;
        this.gridSize = 20; // 网格大小，决定蛇和食物的大小

        // 玩家颜色配置
        this.playerColors = [
            { head: '#4CAF50', body: '#66BB6A' }, // 绿色
            { head: '#2196F3', body: '#64B5F6' }, // 蓝色
            { head: '#F44336', body: '#EF5350' }, // 红色
            { head: '#FFC107', body: '#FFCA28' }, // 黄色
            { head: '#9C27B0', body: '#BA68C8' }  // 紫色
        ];

        // 游戏状态
        this.snakes = [];
        this.foods = [];
        this.maxFoods = 10;
        this.gameLoop = null;
        this.playerCount = 0;
        this.aiCount = 0;
        this.totalPlayers = 0;

        // 游戏配置
        this.difficulty = 'easy'; // 当前难度
        this.speeds = {  // 不同难度对应的速度（毫秒）
            easy: 150,   // 简单模式：较慢
            hard: 100,   // 困难模式：较快
            hell: 70     // 地狱模式：非常快
        };
        this.points = {  // 不同难度对应的分数
            easy: 1,     // 简单模式：1分/个
            hard: 2,     // 困难模式：2分/个
            hell: 3      // 地狱模式：3分/个
        };

        // 创建并加载图片资源
        this.images = {
            head1: this.createImage(20, 20, (ctx) => {
                // 绘制蛇1头（绿色圆形）
                ctx.fillStyle = '#4CAF50';
                ctx.beginPath();
                ctx.arc(10, 10, 9, 0, Math.PI * 2);
                ctx.fill();
                
                // 添加眼睛（白色）
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(14, 7, 3, 0, Math.PI * 2);
                ctx.arc(14, 13, 3, 0, Math.PI * 2);
                ctx.fill();
                
                // 添加瞳孔（黑色）
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(15, 7, 1.5, 0, Math.PI * 2);
                ctx.arc(15, 13, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }),
            head2: this.createImage(20, 20, (ctx) => {
                // 绘制蛇2头（蓝色圆形）
                ctx.fillStyle = '#2196F3';
                ctx.beginPath();
                ctx.arc(10, 10, 9, 0, Math.PI * 2);
                ctx.fill();
                
                // 添加眼睛（白色）
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(14, 7, 3, 0, Math.PI * 2);
                ctx.arc(14, 13, 3, 0, Math.PI * 2);
                ctx.fill();
                
                // 添加瞳孔（黑色）
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(15, 7, 1.5, 0, Math.PI * 2);
                ctx.arc(15, 13, 1.5, 0, Math.PI * 2);
                ctx.fill();
            }),
            body1: this.createImage(20, 20, (ctx) => {
                // 绘制蛇1身体（浅绿色圆形）
                ctx.fillStyle = '#66BB6A';
                ctx.beginPath();
                ctx.arc(10, 10, 8, 0, Math.PI * 2);
                ctx.fill();
            }),
            body2: this.createImage(20, 20, (ctx) => {
                // 绘制蛇2身体（浅蓝色圆形）
                ctx.fillStyle = '#64B5F6';
                ctx.beginPath();
                ctx.arc(10, 10, 8, 0, Math.PI * 2);
                ctx.fill();
            }),
            food: this.createImage(20, 20, (ctx) => {
                // 绘制食物（橙色圆形）
                ctx.fillStyle = '#FF5722';
                ctx.beginPath();
                ctx.arc(10, 10, 8, 0, Math.PI * 2);
                ctx.fill();
                
                // 添加眼睛（白色）
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(7, 8, 2, 0, Math.PI * 2);
                ctx.arc(13, 8, 2, 0, Math.PI * 2);
                ctx.fill();
                
                // 添加笑脸（白色）
                ctx.strokeStyle = 'white';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(10, 12, 4, 0, Math.PI);
                ctx.stroke();
            })
        };

        // 创建音频上下文和音效
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {
            eat: this.createBeepSound(880, 0.1),   // 880Hz, 0.1秒
            over: this.createBeepSound(440, 0.3)   // 440Hz, 0.3秒
        };

        // 初始化UI
        this.createPlayerCountUI();
        this.initEventListeners();
    }

    /**
     * 创建图片
     * @param {number} width 图片宽度
     * @param {number} height 图片高度
     * @param {Function} drawFunction 绘制函数
     * @returns {HTMLImageElement} 图片元素
     */
    createImage(width, height, drawFunction) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        drawFunction(ctx);
        const img = new Image();
        img.src = canvas.toDataURL();
        return img;
    }

    /**
     * 创建蜂鸣音效
     * @param {number} frequency 频率
     * @param {number} duration 持续时间
     * @returns {Function} 播放函数
     */
    createBeepSound(frequency, duration) {
        return () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.value = frequency;
            
            gainNode.gain.setValueAtTime(0.1, this.audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }

    /**
     * 创建玩家数量选择UI
     */
    createPlayerCountUI() {
        const container = document.createElement('div');
        container.style.cssText = 'margin: 20px; text-align: center;';
        
        // 玩家数量输入
        const playerLabel = document.createElement('label');
        playerLabel.textContent = '玩家数量 (1-2): ';
        const playerInput = document.createElement('input');
        playerInput.type = 'number';
        playerInput.min = '1';
        playerInput.max = '2';
        playerInput.value = '1';
        
        // AI数量输入
        const aiLabel = document.createElement('label');
        aiLabel.textContent = ' AI数量 (0-5): ';
        const aiInput = document.createElement('input');
        aiInput.type = 'number';
        aiInput.min = '0';
        aiInput.max = '5';
        aiInput.value = '1';
        
        // 确认按钮
        const confirmButton = document.createElement('button');
        confirmButton.textContent = '确认并开始游戏';
        confirmButton.style.marginLeft = '10px';
        
        // 添加到容器
        container.appendChild(playerLabel);
        container.appendChild(playerInput);
        container.appendChild(aiLabel);
        container.appendChild(aiInput);
        container.appendChild(confirmButton);
        
        // 插入到游戏画布前
        this.canvas.parentElement.insertBefore(container, this.canvas);
        
        // 确认按钮事件
        confirmButton.addEventListener('click', () => {
            const players = parseInt(playerInput.value);
            const ai = parseInt(aiInput.value);
            
            if (players >= 1 && players <= 2 && ai >= 0 && ai <= 5) {
                this.playerCount = players;
                this.aiCount = ai;
                this.totalPlayers = players + ai;
                this.initializeSnakes();
                this.start();
            } else {
                alert('请输入有效的玩家数量！');
            }
        });
    }

    /**
     * 初始化所有蛇
     */
    initializeSnakes() {
        this.snakes = [];
        
        // 计算网格大小
        const gridWidth = this.canvas.width / this.gridSize;
        const gridHeight = this.canvas.height / this.gridSize;
        
        // 初始化玩家控制的蛇
        for (let i = 0; i < this.playerCount; i++) {
            let position;
            let direction;
            
            if (i === 0) {
                // 玩家1：左上角，向右
                position = { x: 3, y: 3 };
                direction = 'right';
            } else {
                // 玩家2：右下角，向左
                position = { x: gridWidth - 4, y: gridHeight - 4 };
                direction = 'left';
            }
            
            this.snakes.push({
                body: this.createSnakeBody(position, direction),
                direction: direction,
                nextDirection: direction,
                score: 0,
                color: this.playerColors[i],
                isAI: false,
                isDead: false,
                controls: i === 0 ? 'arrows' : 'wasd'
            });
        }
        
        // 为AI玩家计算均匀分布的起始位置
        const aiPositions = this.calculateAIStartPositions(this.aiCount);
        
        // 初始化AI控制的蛇
        for (let i = 0; i < this.aiCount; i++) {
            const position = aiPositions[i];
            // 计算朝向场地中心的方向
            const direction = this.calculateDirectionTowardsCenter(position);
            
            this.snakes.push({
                body: this.createSnakeBody(position, direction),
                direction: direction,
                nextDirection: direction,
                score: 0,
                color: this.playerColors[i + this.playerCount],
                isAI: true,
                isDead: false,
                respawnTimer: 0
            });
        }
    }

    /**
     * 计算AI蛇的起始位置
     */
    calculateAIStartPositions(count) {
        const positions = [];
        const gridWidth = this.canvas.width / this.gridSize;
        const gridHeight = this.canvas.height / this.gridSize;
        const centerX = gridWidth / 2;
        const centerY = gridHeight / 2;
        
        // 在画布边缘均匀分布起始位置，避开玩家的位置
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * 2 * Math.PI;
            const radius = Math.min(gridWidth, gridHeight) / 3;
            const x = Math.floor(centerX + Math.cos(angle) * radius);
            const y = Math.floor(centerY + Math.sin(angle) * radius);
            positions.push({x, y});
        }
        
        return positions;
    }

    /**
     * 计算朝向场地中心的方向
     */
    calculateDirectionTowardsCenter(position) {
        const gridWidth = this.canvas.width / this.gridSize;
        const gridHeight = this.canvas.height / this.gridSize;
        const centerX = gridWidth / 2;
        const centerY = gridHeight / 2;
        
        const dx = centerX - position.x;
        const dy = centerY - position.y;
        
        // 根据位置相对于中心的差值决定方向
        if (Math.abs(dx) > Math.abs(dy)) {
            return dx > 0 ? 'right' : 'left';
        } else {
            return dy > 0 ? 'down' : 'up';
        }
    }

    /**
     * 创建蛇的身体
     */
    createSnakeBody(position, direction) {
        const body = [position];
        
        // 根据方向添加身体段
        for (let i = 1; i < 3; i++) {
            const segment = { ...position };
            switch (direction) {
                case 'right':
                    segment.x -= i;
                    break;
                case 'left':
                    segment.x += i;
                    break;
                case 'up':
                    segment.y += i;
                    break;
                case 'down':
                    segment.y -= i;
                    break;
            }
            body.push(segment);
        }
        
        return body;
    }

    /**
     * 初始化事件监听
     */
    initEventListeners() {
        // 键盘控制
        document.addEventListener('keydown', (e) => {
            this.handleInput(e.key);
        });

        // 触摸控制
        const touchControls = document.querySelector('.touch-controls');
        if (touchControls) {
            touchControls.addEventListener('touchstart', (e) => {
                e.preventDefault();
                const button = e.target.closest('.control-btn');
                if (button) {
                    const direction = button.dataset.direction;
                    switch (direction) {
                        case 'up': this.handleInput('ArrowUp'); break;
                        case 'down': this.handleInput('ArrowDown'); break;
                        case 'left': this.handleInput('ArrowLeft'); break;
                        case 'right': this.handleInput('ArrowRight'); break;
                    }
                }
            });

            // 防止触摸滚动
            touchControls.addEventListener('touchmove', (e) => {
                e.preventDefault();
            }, { passive: false });
        }

        // 难度选择
        document.getElementById('difficulty').addEventListener('change', (e) => {
            this.difficulty = e.target.value;
        });

        // 开始按钮
        document.getElementById('startBtn').addEventListener('click', () => {
            const playerCount = parseInt(document.getElementById('playerCount').value);
            const aiCount = parseInt(document.getElementById('aiCount').value);
            
            if (playerCount >= 1 && playerCount <= 2 && aiCount >= 0 && aiCount <= 5) {
                this.playerCount = playerCount;
                this.aiCount = aiCount;
                this.totalPlayers = playerCount + aiCount;
                this.initializeSnakes();
                this.start();
            } else {
                alert('请输入有效的玩家数量！');
            }
        });

        // 重新开始按钮
        document.getElementById('restartBtn').addEventListener('click', () => {
            document.getElementById('gameOver').classList.add('hidden');
            this.initializeSnakes();
            this.start();
        });

        // 处理屏幕方向变化
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    /**
     * 处理输入
     */
    handleInput(key) {
        this.snakes.forEach((snake, index) => {
            if (!snake.isAI && !snake.isDead) {
                if (snake.controls === 'arrows') {
                    if (key === 'ArrowUp' && snake.direction !== 'down') snake.nextDirection = 'up';
                    else if (key === 'ArrowDown' && snake.direction !== 'up') snake.nextDirection = 'down';
                    else if (key === 'ArrowLeft' && snake.direction !== 'right') snake.nextDirection = 'left';
                    else if (key === 'ArrowRight' && snake.direction !== 'left') snake.nextDirection = 'right';
                } else if (snake.controls === 'wasd') {
                    if (key.toLowerCase() === 'w' && snake.direction !== 'down') snake.nextDirection = 'up';
                    else if (key.toLowerCase() === 's' && snake.direction !== 'up') snake.nextDirection = 'down';
                    else if (key.toLowerCase() === 'a' && snake.direction !== 'right') snake.nextDirection = 'left';
                    else if (key.toLowerCase() === 'd' && snake.direction !== 'left') snake.nextDirection = 'right';
                }
            }
        });
    }

    /**
     * 调整画布大小
     */
    resizeCanvas() {
        const container = document.querySelector('.game-container');
        const containerWidth = container.clientWidth;
        this.canvas.width = Math.min(containerWidth - 20, 600);
        this.canvas.height = this.canvas.width;
        this.gridSize = this.canvas.width / 30; // 保持30x30的网格
    }

    /**
     * 开始游戏
     */
    start() {
        this.resizeCanvas();
        this.foods = [];
        this.generateFoods();
        
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
        }
        
        this.gameLoop = setInterval(() => this.update(), this.speeds[this.difficulty]);
    }

    /**
     * 生成新的食物
     * 确保食物不会出现在蛇身上或其他食物位置
     */
    generateFoods() {
        while (this.foods.length < this.maxFoods) {
            let position;
            do {
                position = {
                    x: Math.floor(Math.random() * (this.canvas.width / this.gridSize)),
                    y: Math.floor(Math.random() * (this.canvas.height / this.gridSize))
                };
            } while (
                this.snakes.some(snake => snake.body.some(segment => segment.x === position.x && segment.y === position.y)) ||
                this.foods.some(food => food.x === position.x && food.y === position.y)
            );
            
            this.foods.push(position);
        }
    }

    /**
     * 更新游戏状态
     */
    update() {
        // 更新所有蛇
        this.snakes.forEach((snake, index) => {
            // 如果蛇已经死亡，处理复活逻辑
            if (snake.isDead) {
                if (snake.isAI) {
                    // AI蛇死亡后3秒复活
                    snake.respawnTimer++;
                    if (snake.respawnTimer >= 20) { // 20帧 ≈ 3秒
                        this.respawnSnake(index);
                    }
                }
                return; // 如果蛇死亡，直接返回不处理后续逻辑
            }

            // AI决策
            if (snake.isAI) {
                this.updateAI(snake, index);
            }

            // 更新方向
            snake.direction = snake.nextDirection;

            // 计算新的头部位置
            const head = snake.body[0];
            if (!head) {
                snake.isDead = true;
                return;
            }

            const nextPosition = this.getNextPosition(head, snake.direction);
            if (!nextPosition) {
                snake.isDead = true;
                return;
            }

            // 检查碰撞
            if (this.checkCollision(nextPosition, index)) {
                if (snake.isAI) {
                    snake.isDead = true;
                    snake.respawnTimer = 0;
                } else {
                    this.gameOver();
                }
                return;
            }

            // 移动蛇
            snake.body.unshift(nextPosition);

            // 检查是否吃到食物
            const foodIndex = this.foods.findIndex(food => 
                food && food.x === nextPosition.x && food.y === nextPosition.y
            );

            if (foodIndex !== -1) {
                this.sounds.eat();
                snake.score += this.points[this.difficulty];
                this.foods.splice(foodIndex, 1);
                this.generateFoods();
            } else {
                // 检查是否吃到其他蛇的尾部
                let tailEaten = false;
                this.snakes.forEach((otherSnake, otherIndex) => {
                    if (index !== otherIndex && !otherSnake.isDead && otherSnake.body.length > 3) {
                        const tailSegments = otherSnake.body.slice(-3);
                        if (tailSegments.some(segment => 
                            segment && segment.x === nextPosition.x && segment.y === nextPosition.y
                        )) {
                            // 吃掉尾部，获得长度
                            const eatenLength = otherSnake.body.length;
                            otherSnake.body = otherSnake.body.slice(0, -3);
                            for (let i = 0; i < eatenLength; i++) {
                                snake.body.push({...snake.body[snake.body.length - 1]});
                            }
                            snake.score += Math.floor(eatenLength / 2);
                            tailEaten = true;
                        }
                    }
                });

                if (!tailEaten) {
                    snake.body.pop();
                }
            }
        });

        // 检查是否所有真实玩家都死亡
        const allPlayersLost = this.snakes
            .filter(snake => !snake.isAI)
            .every(snake => snake.isDead);

        if (allPlayersLost) {
            this.gameOver();
            return;
        }

        this.updateScore();
        this.draw();
    }

    /**
     * 复活AI蛇
     */
    respawnSnake(index) {
        const snake = this.snakes[index];
        const position = this.calculateAIStartPositions(1)[0];
        snake.body = this.createSnakeBody(position, this.calculateDirectionTowardsCenter(position));
        snake.direction = this.calculateDirectionTowardsCenter(position);
        snake.nextDirection = this.calculateDirectionTowardsCenter(position);
        snake.isDead = false;
        snake.respawnTimer = 0;
    }

    /**
     * 检查碰撞
     */
    checkCollision(position, snakeIndex) {
        if (!position) return true;

        // 检查墙壁碰撞
        if (position.x < 0 || position.x >= this.canvas.width / this.gridSize ||
            position.y < 0 || position.y >= this.canvas.height / this.gridSize) {
            return true;
        }

        // 检查与所有蛇的碰撞
        return this.snakes.some((otherSnake, otherIndex) => {
            if (otherSnake.isDead || !otherSnake.body) return false;
            
            // 如果是同一条蛇，检查自身碰撞（除了尾部）
            if (otherIndex === snakeIndex) {
                return otherSnake.body.some((segment, segIndex) => 
                    segment && segIndex < otherSnake.body.length - 3 && 
                    segment.x === position.x && 
                    segment.y === position.y
                );
            }
            
            // 如果是其他蛇，检查除尾部外的碰撞
            return otherSnake.body.some((segment, segIndex) => 
                segment && segIndex < otherSnake.body.length - 3 &&
                segment.x === position.x && 
                segment.y === position.y
            );
        });
    }

    /**
     * 绘制游戏画面
     */
    draw() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制食物
        this.foods.forEach(food => {
            this.ctx.fillStyle = '#FF5722';
            this.ctx.beginPath();
            this.ctx.arc(
                food.x * this.gridSize + this.gridSize/2,
                food.y * this.gridSize + this.gridSize/2,
                this.gridSize/2 - 2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        });

        // 绘制所有蛇
        this.snakes.forEach((snake, index) => {
            if (snake.isDead) return;

            snake.body.forEach((segment, segmentIndex) => {
                const isHead = segmentIndex === 0;
                const isTail = segmentIndex >= snake.body.length - 3;
                
                this.ctx.fillStyle = isHead ? snake.color.head : 
                                    isTail ? '#FFA000' : snake.color.body;
                
                this.ctx.beginPath();
                this.ctx.arc(
                    segment.x * this.gridSize + this.gridSize/2,
                    segment.y * this.gridSize + this.gridSize/2,
                    this.gridSize/2 - 2,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();

                // 为头部添加眼睛
                if (isHead) {
                    this.drawSnakeEyes(segment, snake.direction);
                }
            });
        });
    }

    /**
     * 绘制蛇的眼睛
     */
    drawSnakeEyes(head, direction) {
        const eyePositions = {
            'up': [{x: -3, y: -5}, {x: 3, y: -5}],
            'down': [{x: -3, y: 5}, {x: 3, y: 5}],
            'left': [{x: -5, y: -3}, {x: -5, y: 3}],
            'right': [{x: 5, y: -3}, {x: 5, y: 3}]
        };

        const eyes = eyePositions[direction];
        this.ctx.fillStyle = 'white';
        eyes.forEach(eye => {
            this.ctx.beginPath();
            this.ctx.arc(
                head.x * this.gridSize + this.gridSize/2 + eye.x,
                head.y * this.gridSize + this.gridSize/2 + eye.y,
                2,
                0,
                Math.PI * 2
            );
            this.ctx.fill();
        });
    }

    /**
     * 更新分数显示
     */
    updateScore() {
        let scoreText = '';
        this.snakes.forEach((snake, index) => {
            const playerType = snake.isAI ? 'AI' : '玩家';
            scoreText += `${playerType}${index + 1}: ${snake.score}分 `;
            if (snake.isDead) scoreText += '(已死亡) ';
            scoreText += '| ';
        });
        document.getElementById('currentScore').textContent = scoreText;
    }

    /**
     * 游戏结束处理
     */
    gameOver() {
        this.sounds.over();
        clearInterval(this.gameLoop);
        
        // 找出获胜者
        const winners = this.snakes
            .map((snake, index) => ({score: snake.score, index: index}))
            .sort((a, b) => b.score - a.score);
        
        const winnerText = winners.map((winner, place) => {
            const snake = this.snakes[winner.index];
            const playerType = snake.isAI ? 'AI' : '玩家';
            return `第${place + 1}名: ${playerType}${winner.index + 1} (${winner.score}分)`;
        }).join('\n');
        
        document.getElementById('gameOver').classList.remove('hidden');
        document.getElementById('finalScore').textContent = winnerText;
    }

    /**
     * 根据当前位置和方向计算下一个位置
     */
    getNextPosition(position, direction) {
        if (!position) return null;
        
        const next = { x: position.x, y: position.y };
        switch (direction) {
            case 'up':
                next.y--;
                break;
            case 'down':
                next.y++;
                break;
            case 'left':
                next.x--;
                break;
            case 'right':
                next.x++;
                break;
            default:
                return null;
        }
        return next;
    }

    /**
     * 显示排行榜
     * @param {Array} leaderboard 排行榜数据
     */
    displayLeaderboard(leaderboard) {
        const leaderboardList = document.getElementById('leaderboardList');
        leaderboardList.innerHTML = ''; // 清空现有内容

        // 对排行榜数据进行排序
        const sortedLeaderboard = [...leaderboard]
            .sort((a, b) => b.score - a.score)
            .slice(0, 10); // 只显示前10名

        // 添加排行榜项目
        sortedLeaderboard.forEach((entry, index) => {
            const item = addLeaderboardItem(
                index + 1,
                entry.name || '匿名',
                entry.score
            );
            leaderboardList.appendChild(item);
        });

        // 如果没有数据，显示提示信息
        if (sortedLeaderboard.length === 0) {
            const emptyMessage = document.createElement('div');
            emptyMessage.className = 'leaderboard-item';
            emptyMessage.innerHTML = '<span class="name">暂无记录</span>';
            leaderboardList.appendChild(emptyMessage);
        }
    }

    /**
     * 更新AI蛇的移动方向
     * @param {Object} snake AI蛇对象
     * @param {number} index 蛇的索引
     */
    updateAI(snake, index) {
        // 获取当前头部位置
        const head = snake.body[0];
        
        // 找到最近的食物
        let nearestFood = this.findNearestFood(head);
        
        // 如果附近有其他蛇的尾巴，考虑追击
        const nearestTail = this.findNearestTail(head, index);
        if (nearestTail && this.getDistance(head, nearestTail) < this.getDistance(head, nearestFood)) {
            nearestFood = nearestTail;
        }

        // 计算到目标的方向
        const directions = ['up', 'down', 'left', 'right'];
        let bestDirection = snake.direction;
        let minDistance = Infinity;

        // 评估每个可能的方向
        directions.forEach(direction => {
            // 不能往反方向走
            if (this.isOppositeDirection(direction, snake.direction)) {
                return;
            }

            // 计算该方向下一个位置
            const nextPos = this.getNextPosition(head, direction);
            
            // 检查是否会导致碰撞
            if (this.checkCollision(nextPos, index)) {
                return;
            }

            // 计算到目标的距离
            const distance = this.getDistance(nextPos, nearestFood);
            
            // 如果这个方向更接近目标，更新最佳方向
            if (distance < minDistance) {
                minDistance = distance;
                bestDirection = direction;
            }
        });

        // 更新方向
        snake.nextDirection = bestDirection;
    }

    /**
     * 找到最近的食物
     * @param {Object} position 当前位置
     * @returns {Object} 最近的食物位置
     */
    findNearestFood(position) {
        let nearest = this.foods[0];
        let minDistance = Infinity;

        this.foods.forEach(food => {
            const distance = this.getDistance(position, food);
            if (distance < minDistance) {
                minDistance = distance;
                nearest = food;
            }
        });

        return nearest;
    }

    /**
     * 找到最近的其他蛇的尾巴
     * @param {Object} position 当前位置
     * @param {number} currentSnakeIndex 当前蛇的索引
     * @returns {Object|null} 最近的尾巴位置或null
     */
    findNearestTail(position, currentSnakeIndex) {
        let nearest = null;
        let minDistance = Infinity;

        this.snakes.forEach((snake, index) => {
            if (index !== currentSnakeIndex && !snake.isDead) {
                const tail = snake.body[snake.body.length - 1];
                const distance = this.getDistance(position, tail);
                if (distance < minDistance) {
                    minDistance = distance;
                    nearest = tail;
                }
            }
        });

        return nearest;
    }

    /**
     * 计算两点之间的距离
     * @param {Object} pos1 第一个位置
     * @param {Object} pos2 第二个位置
     * @returns {number} 距离
     */
    getDistance(pos1, pos2) {
        return Math.abs(pos1.x - pos2.x) + Math.abs(pos1.y - pos2.y);
    }

    /**
     * 检查是否是相反的方向
     * @param {string} dir1 第一个方向
     * @param {string} dir2 第二个方向
     * @returns {boolean} 是否相反
     */
    isOppositeDirection(dir1, dir2) {
        return (dir1 === 'up' && dir2 === 'down') ||
               (dir1 === 'down' && dir2 === 'up') ||
               (dir1 === 'left' && dir2 === 'right') ||
               (dir1 === 'right' && dir2 === 'left');
    }
}

// 当页面加载完成后初始化游戏
window.addEventListener('load', () => {
    let game;
    
    // 创建开始游戏的函数
    const startGame = () => {
        if (!game) {
            game = new SnakeGame();
            game.displayLeaderboard(JSON.parse(localStorage.getItem('leaderboard') || '[]'));
        }
        // 移除事件监听器
        document.removeEventListener('click', startGame);
        document.removeEventListener('keydown', startGame);
    };

    // 添加事件监听器，等待用户交互
    document.addEventListener('click', startGame);
    document.addEventListener('keydown', startGame);

    // 显示提示信息
    const startMessage = document.createElement('div');
    startMessage.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        text-align: center;
        font-size: 24px;
        z-index: 1000;
    `;
    startMessage.textContent = '点击任意位置或按任意键开始游戏';
    document.body.appendChild(startMessage);

    // 当游戏开始时移除提示信息
    const removeMessage = () => {
        startMessage.remove();
        document.removeEventListener('click', removeMessage);
        document.removeEventListener('keydown', removeMessage);
    };
    document.addEventListener('click', removeMessage);
    document.addEventListener('keydown', removeMessage);
}); 