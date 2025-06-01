// 遊戲狀態
let gameState = 'start';
let score = 0;
let items = [];
let hands = [];
let learningProgress = {
    edtech: 0,
    pedagogy: 0,
    technology: 0
};

// 教育科技知識庫
const edtechContent = {
    edtech: [
        { emoji: '📱', term: 'Mobile Learning', question: '移動學習的優點是什麼？', answer: '隨時隨地學習' },
        { emoji: '🎮', term: 'Gamification', question: '遊戲化學習的核心要素是？', answer: '即時回饋與獎勵機制' },
        { emoji: '🤖', term: 'AI in Education', question: 'AI在教育中的應用是？', answer: '個人化學習' },
        { emoji: '📊', term: 'Learning Analytics', question: '學習分析的目的是？', answer: '改善學習成效' }
    ],
    pedagogy: [
        { emoji: '👥', term: 'Collaborative Learning', question: '協作學習的特點是？', answer: '團隊合作' },
        { emoji: '🧩', term: 'Problem-Based Learning', question: 'PBL的核心是？', answer: '解決真實問題' },
        { emoji: '🎯', term: 'Adaptive Learning', question: '適性學習的優勢是？', answer: '個人化進度' }
    ],
    technology: [
        { emoji: '💻', term: 'LMS', question: '學習管理系統的功能是？', answer: '課程管理與追蹤' },
        { emoji: '🌐', term: 'Web 3.0', question: 'Web 3.0對教育的影響是？', answer: '去中心化學習' },
        { emoji: '📡', term: 'IoT in Education', question: '物聯網在教育中的應用？', answer: '智慧校園' }
    ]
};

// 畫布設置
const handCanvas = document.getElementById('handCanvas');
const gameCanvas = document.getElementById('gameCanvas');
const handCtx = handCanvas.getContext('2d');
const gameCtx = gameCanvas.getContext('2d');

// 設置畫布大小
function resizeCanvases() {
    handCanvas.width = window.innerWidth;
    handCanvas.height = window.innerHeight;
    gameCanvas.width = window.innerWidth;
    gameCanvas.height = window.innerHeight;
}

// 初始化
window.addEventListener('load', () => {
    resizeCanvases();
    setupHandTracking();
    setupEventListeners();
});

window.addEventListener('resize', resizeCanvases);

// 事件監聽器設置
function setupEventListeners() {
    document.getElementById('startButton').addEventListener('click', startGame);
    document.getElementById('instructionsButton').addEventListener('click', showInstructions);
    document.getElementById('backToStart').addEventListener('click', showStartScreen);
}

// 畫面切換函數
function showStartScreen() {
    gameState = 'start';
    document.getElementById('startScreen').classList.remove('hidden');
    document.getElementById('instructionsScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
}

function showInstructions() {
    gameState = 'instructions';
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('instructionsScreen').classList.remove('hidden');
    document.getElementById('gameScreen').classList.add('hidden');
}

function startGame() {
    gameState = 'playing';
    score = 0;
    document.getElementById('score').textContent = score;
    document.getElementById('startScreen').classList.add('hidden');
    document.getElementById('instructionsScreen').classList.add('hidden');
    document.getElementById('gameScreen').classList.remove('hidden');
    items = [];
    gameLoop();
}

// 手部追蹤設置
function setupHandTracking() {
    const hands = new Hands({
        locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
        }
    });

    hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
    });

    hands.onResults(onHandResults);

    const camera = new Camera(handCanvas, {
        onFrame: async () => {
            await hands.send({image: handCanvas});
        },
        width: 1280,
        height: 720
    });
    camera.start();
}

// 手部追蹤結果處理
function onHandResults(results) {
    handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);
    
    if (results.multiHandLandmarks) {
        hands = results.multiHandLandmarks;
        for (let i = 0; i < results.multiHandLandmarks.length; i++) {
            const hand = results.multiHandLandmarks[i];
            const handedness = results.multiHandedness[i].label;
            
            // 繪製手部輪廓
            drawConnectors(handCtx, hand, HAND_CONNECTIONS, {
                color: handedness === 'Left' ? '#00FF00' : '#FF0000',
                lineWidth: 5
            });
            drawLandmarks(handCtx, hand, {
                color: handedness === 'Left' ? '#00FF00' : '#FF0000',
                lineWidth: 2
            });
        }
    }
}

// 遊戲物品類
class GameItem {
    constructor() {
        this.x = Math.random() * gameCanvas.width;
        this.y = -50;
        this.width = 50;
        this.height = 50;
        this.speed = 2 + Math.random() * 2;
        this.category = this.getRandomCategory();
        this.content = this.getRandomContent();
        this.type = Math.random() < 0.5 ? 'left' : 'right';
        this.isQuestion = Math.random() < 0.3; // 30% 機率出現問題
    }

    getRandomCategory() {
        const categories = ['edtech', 'pedagogy', 'technology'];
        return categories[Math.floor(Math.random() * categories.length)];
    }

    getRandomContent() {
        const categoryContent = edtechContent[this.category];
        return categoryContent[Math.floor(Math.random() * categoryContent.length)];
    }

    update() {
        this.y += this.speed;
        return this.y > gameCanvas.height;
    }

    draw() {
        gameCtx.font = '40px Arial';
        gameCtx.fillStyle = this.type === 'left' ? '#00FF00' : '#FF0000';
        gameCtx.fillText(this.content.emoji, this.x, this.y);
        
        // 顯示術語或問題
        gameCtx.font = '16px Arial';
        gameCtx.fillStyle = 'white';
        const text = this.isQuestion ? this.content.question : this.content.term;
        gameCtx.fillText(text, this.x - 50, this.y + 30);
    }

    checkCollision(hand, isLeft) {
        if (!hand) return false;
        
        const palmX = hand[0].x * gameCanvas.width;
        const palmY = hand[0].y * gameCanvas.height;
        
        const distance = Math.sqrt(
            Math.pow(palmX - this.x, 2) + 
            Math.pow(palmY - this.y, 2)
        );
        
        if (distance < 50) {
            return (isLeft && this.type === 'left') || (!isLeft && this.type === 'right');
        }
        return false;
    }

    handleCapture() {
        if (this.isQuestion) {
            const answer = prompt(this.content.question + '\n請輸入答案：');
            if (answer && answer.includes(this.content.answer)) {
                score += 3;
                learningProgress[this.category] += 2;
                showFeedback('正確！ +3分', 'success');
            } else {
                score = Math.max(0, score - 1);
                showFeedback('答案不正確。正確答案是：' + this.content.answer, 'error');
            }
        } else {
            score++;
            learningProgress[this.category]++;
            showFeedback(this.content.term + ' +1分', 'info');
        }
    }
}

// 顯示學習回饋
function showFeedback(message, type) {
    const feedback = document.createElement('div');
    feedback.className = `feedback ${type}`;
    feedback.textContent = message;
    document.body.appendChild(feedback);
    
    // 動畫效果
    setTimeout(() => {
        feedback.style.opacity = '0';
        setTimeout(() => feedback.remove(), 500);
    }, 2000);
}

// 遊戲主循環
function gameLoop() {
    if (gameState !== 'playing') return;

    // 清除畫布
    gameCtx.clearRect(0, 0, gameCanvas.width, gameCanvas.height);

    // 顯示學習進度
    showLearningProgress();

    // 生成新物品
    if (Math.random() < 0.02) {
        items.push(new GameItem());
    }

    // 更新和繪製物品
    items = items.filter(item => {
        const fallen = item.update();
        if (fallen) {
            score = Math.max(0, score - 1);
            document.getElementById('score').textContent = score;
        }
        item.draw();
        return !fallen;
    });

    // 檢查碰撞
    if (hands.length > 0) {
        items = items.filter(item => {
            let collision = false;
            hands.forEach((hand, index) => {
                const isLeft = index === 0;
                if (item.checkCollision(hand, isLeft)) {
                    item.handleCapture();
                    collision = true;
                }
            });
            return !collision;
        });
    }

    // 檢查勝利條件
    if (score >= 20) {
        const totalProgress = Object.values(learningProgress).reduce((a, b) => a + b, 0);
        alert(`恭喜你獲勝！\n\n學習成果：\n教育科技知識: ${learningProgress.edtech}\n教學法知識: ${learningProgress.pedagogy}\n技術知識: ${learningProgress.technology}\n\n總學習進度: ${totalProgress}`);
        showStartScreen();
        return;
    }

    requestAnimationFrame(gameLoop);
}

// 顯示學習進度
function showLearningProgress() {
    gameCtx.font = '16px Arial';
    gameCtx.fillStyle = 'white';
    gameCtx.fillText(`教育科技: ${learningProgress.edtech}`, 10, 80);
    gameCtx.fillText(`教學法: ${learningProgress.pedagogy}`, 10, 100);
    gameCtx.fillText(`技術: ${learningProgress.technology}`, 10, 120);
} 
