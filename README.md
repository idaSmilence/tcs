# 多人在线贪吃蛇游戏

一个支持多人同时在线的贪吃蛇游戏，使用WebSocket实现实时通信。

## 特性

- 支持最多10人同时在线游戏
- 实时显示所有玩家位置和分数
- 自动分配玩家ID（A-J）
- 实时排行榜
- 三种难度级别
- 触摸屏支持
- 响应式设计
- 深色模式支持

## 技术栈

- 前端：HTML5, CSS3, JavaScript
- 后端：Node.js, Express
- 通信：WebSocket (ws)

## 安装和运行

1. 克隆仓库：
```bash
git clone [你的仓库URL]
cd multiplayer-snake-game
```

2. 安装依赖：
```bash
npm install
```

3. 启动服务器：
```bash
npm start
```

4. 访问游戏：
在浏览器中打开 `http://localhost:3000`

## 游戏控制

- 键盘方向键控制移动
- 触摸屏设备可使用虚拟方向键
- 选择难度后点击"开始游戏"
- 实时查看在线玩家和排行榜

## 开发

开发模式（支持热重载）：
```bash
npm run dev
```

## 许可证

MIT 