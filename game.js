// 遊戲狀態
const gameState = {
    energy: 100,
    streak: 0,
    level: 1,
    score: 0,
    achievements: [],
    isPlaying: false,
    selectedOption: null,
    canAnswer: true,
    leftHandGesture: null,
    rightHandGesture: null
};

// 遊戲配置
const config = {
    maxEnergy: 100,
    energyLossPerWrong: 20,
    energyGainPerCorrect: 15,
    baseTime: 30,
    minEnergy: 0
};

// 成就系統
const achievements = {
    LIFE_BEGINNER: {
        id: 'life_beginner',
        title: '人生新手',
        description: '完成第一個選擇',
        icon: '🌱',
        condition: (state) => state.score > 0
    },
    ENERGY_MASTER: {
        id: 'energy_master',
        title: '精力充沛',
        description: '保持精力值在90%以上完成3次選擇',
        icon: '⚡',
        condition: (state) => state.energy >= 90 && state.streak >= 3
    },
    STREAK_MASTER: {
        id: 'streak_master',
        title: '決策達人',
        description: '達成5次連續正確選擇',
        icon: '🎯',
        condition: (state) => state.streak >= 5
    },
    SURVIVOR: {
        id: 'survivor',
        title: '絕處逢生',
        description: '精力值低於20%時做出正確選擇',
        icon: '🛟',
        condition: (state) => state.energy <= 20 && state.lastCorrect
    },
    SPEED_DEMON: {
        id: 'speed_demon',
        title: '光速決策',
        description: '在5秒內做出正確選擇',
        icon: '⚡',
        condition: (state) => state.lastAnswerTime <= 5 && state.lastCorrect
    }
};

// 人生場景
const scenarios = [
    {
        text: "你剛畢業，收到了兩個工作機會：一個是大公司的普通職位，一個是新創公司的重要職位。你選擇？",
        options: [
            {
                text: "加入大公司",
                outcome: "你選擇了穩定的道路，這讓你能夠慢慢累積經驗。",
                correct: true
            },
            {
                text: "加入新創公司",
                outcome: "雖然風險較大，但你獲得了寶貴的創業經驗。",
                correct: true
            }
        ]
    },
    {
        text: "你的主管給了你一個重要項目，但截止日期很緊迫。你會？",
        options: [
            {
                text: "犧牲休息時間加班",
                outcome: "你完成了項目，但感到非常疲憊。",
                correct: false
            },
            {
                text: "與主管溝通，爭取更多時間",
                outcome: "主管理解了你的困境，給予了合理的延期。",
                correct: true
            }
        ]
    },
    {
        text: "你發現同事在項目中犯了一個嚴重錯誤，你會？",
        options: [
            {
                text: "私下告訴同事",
                outcome: "同事感謝你的提醒，你們的關係更好了。",
                correct: true
            },
            {
                text: "直接在會議上指出",
                outcome: "雖然問題解決了，但同事感到被羞辱。",
                correct: false
            }
        ]
    },
    {
        text: "公司提供了國外工作的機會，但需要離開家人和朋友。你的選擇是？",
        options: [
            {
                text: "接受挑戰",
                outcome: "你獲得了寶貴的國際經驗。",
                correct: true
            },
            {
                text: "留在原地",
                outcome: "你選擇了生活品質，但錯過了成長機會。",
                correct: false
            }
        ]
    }
];

// 手势配置
const gestureConfig = {
    threshold: 0.15,  // 手势判定阈值
    updateInterval: 100  // 手势更新间隔（毫秒）
};

// 初始化手部检测
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

// 初始化相机
async function initCamera() {
    const videoElement = document.getElementById('input-video');
    const handCanvas = document.getElementById('hand-canvas');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: {
                width: 640,
                height: 480,
                facingMode: 'user'
            }
        });

        videoElement.srcObject = stream;
        await videoElement.play();

        handCanvas.width = videoElement.videoWidth;
        handCanvas.height = videoElement.videoHeight;

        const camera = new Camera(videoElement, {
            onFrame: async () => {
                await hands.send({image: videoElement});
            },
            width: 640,
            height: 480
        });

        await camera.start();

    } catch (error) {
        console.error('相機初始化錯誤:', error);
        alert('無法訪問相機，請確保已授予權限並重新整理頁面');
    }
}

// 手势处理
hands.onResults((results) => {
    const handCtx = document.getElementById('hand-canvas').getContext('2d');
    
    // 清除画布
    handCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);
    
    // 绘制镜像的视频
    handCtx.save();
    handCtx.scale(-1, 1);
    handCtx.translate(-handCanvas.width, 0);
    handCtx.drawImage(videoElement, 0, 0, handCanvas.width, handCanvas.height);
    handCtx.restore();
    
    if (results.multiHandLandmarks && gameState.isPlaying) {
        // 重置手势状态
        let leftHandGesture = null;
        let rightHandGesture = null;

        results.multiHandedness.forEach((hand, index) => {
            const isLeft = hand.label.toLowerCase() === 'left';
            const handType = isLeft ? 'right' : 'left'; // 因为镜像效果需要反转
            const landmarks = results.multiHandLandmarks[index];
            const color = isLeft ? '#00FF00' : '#FF0000';
            
            // 绘制手部轮廓
            handCtx.save();
            handCtx.scale(-1, 1);
            handCtx.translate(-handCanvas.width, 0);

            // 绘制手部连接线
            drawConnectors(handCtx, landmarks, HAND_CONNECTIONS, {
                color: color,
                lineWidth: 3
            });

            // 绘制关键点
            drawLandmarks(handCtx, landmarks, {
                color: color,
                lineWidth: 2,
                radius: 4,
                fillColor: 'white'
            });

            // 绘制手掌轮廓
            handCtx.beginPath();
            handCtx.moveTo(landmarks[0].x * handCanvas.width, landmarks[0].y * handCanvas.height);
            // 绘制拇指外侧轮廓
            for (let i of [1, 2, 3, 4]) {
                handCtx.lineTo(landmarks[i].x * handCanvas.width, landmarks[i].y * handCanvas.height);
            }
            // 绘制食指外侧轮廓
            for (let i of [5, 6, 7, 8]) {
                handCtx.lineTo(landmarks[i].x * handCanvas.width, landmarks[i].y * handCanvas.height);
            }
            // 绘制中指外侧轮廓
            for (let i of [9, 10, 11, 12]) {
                handCtx.lineTo(landmarks[i].x * handCanvas.width, landmarks[i].y * handCanvas.height);
            }
            // 绘制无名指外侧轮廓
            for (let i of [13, 14, 15, 16]) {
                handCtx.lineTo(landmarks[i].x * handCanvas.width, landmarks[i].y * handCanvas.height);
            }
            // 绘制小指外侧轮廓
            for (let i of [17, 18, 19, 20]) {
                handCtx.lineTo(landmarks[i].x * handCanvas.width, landmarks[i].y * handCanvas.height);
            }
            // 闭合手掌轮廓
            handCtx.lineTo(landmarks[0].x * handCanvas.width, landmarks[0].y * handCanvas.height);
            
            // 设置轮廓样式
            handCtx.strokeStyle = color;
            handCtx.lineWidth = 2;
            handCtx.stroke();
            
            // 添加半透明填充
            handCtx.fillStyle = `${color}33`; // 20% 透明度
            handCtx.fill();

            // 添加发光效果
            handCtx.shadowColor = color;
            handCtx.shadowBlur = 15;
            handCtx.stroke();

            handCtx.restore();
            
            // 获取手腕和食指的坐标
            const wrist = landmarks[0];
            const indexFinger = landmarks[8];
            
            // 计算相对位移（考虑镜像效果）
            const deltaY = indexFinger.y - wrist.y;
            const deltaX = -(indexFinger.x - wrist.x);
            
            // 判断手势方向
            let gesture = null;
            if (Math.abs(deltaY) > Math.abs(deltaX)) {
                if (deltaY < -gestureConfig.threshold) gesture = 'up';
                else if (deltaY > gestureConfig.threshold) gesture = 'down';
            } else {
                if (deltaX < -gestureConfig.threshold) gesture = 'left';
                else if (deltaX > gestureConfig.threshold) gesture = 'right';
            }

            // 存储手势
            if (handType === 'left') leftHandGesture = gesture;
            else rightHandGesture = gesture;

            // 添加手势方向指示器
            if (gesture) {
                handCtx.save();
                handCtx.scale(-1, 1);
                handCtx.translate(-handCanvas.width, 0);
                
                const centerX = wrist.x * handCanvas.width;
                const centerY = wrist.y * handCanvas.height;
                const arrowLength = 30;
                
                handCtx.beginPath();
                handCtx.moveTo(centerX, centerY);
                
                let endX = centerX;
                let endY = centerY;
                
                switch (gesture) {
                    case 'up':
                        endY -= arrowLength;
                        break;
                    case 'down':
                        endY += arrowLength;
                        break;
                    case 'left':
                        endX -= arrowLength;
                        break;
                    case 'right':
                        endX += arrowLength;
                        break;
                }
                
                handCtx.lineTo(endX, endY);
                handCtx.strokeStyle = color;
                handCtx.lineWidth = 3;
                handCtx.stroke();
                
                // 绘制箭头头部
                const angle = Math.atan2(endY - centerY, endX - centerX);
                handCtx.beginPath();
                handCtx.moveTo(endX, endY);
                handCtx.lineTo(
                    endX - 10 * Math.cos(angle - Math.PI / 6),
                    endY - 10 * Math.sin(angle - Math.PI / 6)
                );
                handCtx.moveTo(endX, endY);
                handCtx.lineTo(
                    endX - 10 * Math.cos(angle + Math.PI / 6),
                    endY - 10 * Math.sin(angle + Math.PI / 6)
                );
                handCtx.stroke();
                
                handCtx.restore();
            }
        });

        // 处理手势
        handleGestures(leftHandGesture, rightHandGesture);
    }
});

// 处理手势逻辑
function handleGestures(leftGesture, rightGesture) {
    const options = document.querySelectorAll('.option');
    
    // 使用左手选择选项
    if (leftGesture && gameState.canAnswer) {
        let newSelection = null;
        
        switch (leftGesture) {
            case 'left':
                newSelection = 0;
                break;
            case 'right':
                newSelection = 1;
                break;
            case 'up':
                newSelection = 2;
                break;
            case 'down':
                newSelection = 3;
                break;
        }

        if (newSelection !== null && newSelection < options.length) {
            // 移除之前的选择
            options.forEach(opt => opt.classList.remove('highlight'));
            
            // 高亮新选择
            options[newSelection].classList.add('highlight');
            gameState.selectedOption = newSelection;
        }
    }

    // 使用右手确认选择
    if (rightGesture === 'up' && gameState.selectedOption !== null && gameState.canAnswer) {
        const selectedOption = options[gameState.selectedOption];
        selectedOption.classList.add('confirm');
        
        // 确认选择
        const scenario = scenarios[gameState.currentScenario];
        makeChoice(scenario.options[gameState.selectedOption], scenario);
    }
}

// 初始化遊戲
async function initGame() {
    // 初始化相机
    await initCamera();
    
    // 初始化游戏状态
    gameState.energy = config.maxEnergy;
    gameState.streak = 0;
    gameState.level = 1;
    gameState.score = 0;
    gameState.isPlaying = true;
    gameState.selectedOption = null;
    gameState.canAnswer = true;
    
    updateUI();
    nextScenario();
}

// 更新UI
function updateUI() {
    // 更新精力值
    const energyFill = document.querySelector('.energy-fill');
    const energyText = document.querySelector('.energy-text');
    energyFill.style.width = `${gameState.energy}%`;
    energyText.textContent = `${Math.round(gameState.energy)}%`;

    // 更新連擊數
    document.querySelector('.streak-count').textContent = gameState.streak;
    
    // 更新等級
    document.querySelector('.level-value').textContent = gameState.level;
}

// 顯示場景
function nextScenario() {
    gameState.currentScenario = Math.floor(Math.random() * scenarios.length);
    const scenario = scenarios[gameState.currentScenario];
    
    document.querySelector('.scenario').textContent = scenario.text;
    createOptions(scenario);
    
    // 重置状态
    gameState.selectedOption = null;
    gameState.canAnswer = true;
    
    // 開始計時
    startTimer();
}

// 計時器
let timer;
function startTimer() {
    let timeLeft = config.baseTime;
    const timerValue = document.querySelector('.timer-value');
    
    clearInterval(timer);
    timerValue.textContent = timeLeft;
    
    timer = setInterval(() => {
        timeLeft--;
        timerValue.textContent = timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            makeChoice({ correct: false, outcome: "時間到！你錯過了這個機會。" }, null);
        }
    }, 1000);
}

// 做出選擇
function makeChoice(option, scenario) {
    if (!gameState.canAnswer) return;
    
    gameState.canAnswer = false;
    clearInterval(timer);
    
    const timeSpent = config.baseTime - parseInt(document.querySelector('.timer-value').textContent);
    gameState.lastAnswerTime = timeSpent;
    gameState.lastCorrect = option.correct;

    if (option.correct) {
        gameState.streak++;
        gameState.score += 100 * (1 + gameState.streak * 0.1);
        gameState.energy = Math.min(config.maxEnergy, gameState.energy + config.energyGainPerCorrect);
    } else {
        gameState.streak = 0;
        gameState.energy = Math.max(config.minEnergy, gameState.energy - config.energyLossPerWrong);
    }

    // 檢查成就
    checkAchievements();
    
    // 顯示結果
    showOutcome(option.outcome);
    
    // 更新UI
    updateUI();
    
    // 檢查遊戲是否結束
    if (gameState.energy <= config.minEnergy) {
        endGame();
        return;
    }

    // 3秒後顯示下一個場景
    setTimeout(() => {
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.remove('highlight', 'confirm');
        });
        nextScenario();
    }, 3000);
}

// 顯示結果
function showOutcome(outcome) {
    const scenario = document.querySelector('.scenario');
    scenario.textContent = outcome;
    scenario.style.color = 'var(--accent)';
    
    setTimeout(() => {
        scenario.style.color = 'var(--text)';
    }, 3000);
}

// 檢查成就
function checkAchievements() {
    Object.values(achievements).forEach(achievement => {
        if (!gameState.achievements.includes(achievement.id) && 
            achievement.condition(gameState)) {
            unlockAchievement(achievement);
        }
    });
}

// 解鎖成就
function unlockAchievement(achievement) {
    gameState.achievements.push(achievement.id);
    
    // 顯示成就彈窗
    const popup = document.querySelector('.achievement-popup');
    const icon = popup.querySelector('.achievement-icon');
    const title = popup.querySelector('.achievement-title');
    const description = popup.querySelector('.achievement-description');
    
    icon.textContent = achievement.icon;
    title.textContent = achievement.title;
    description.textContent = achievement.description;
    
    popup.style.display = 'flex';
    
    // 3秒後隱藏
    setTimeout(() => {
        popup.style.display = 'none';
    }, 3000);
    
    // 更新最近成就展示
    updateRecentAchievements();
}

// 更新最近成就展示
function updateRecentAchievements() {
    const recentAchievements = document.querySelector('.recent-achievements');
    recentAchievements.innerHTML = '';
    
    gameState.achievements.slice(-3).forEach(id => {
        const achievement = achievements[id];
        const div = document.createElement('div');
        div.className = 'achievement-item';
        div.innerHTML = `
            <span class="achievement-icon">${achievement.icon}</span>
            <span class="achievement-name">${achievement.title}</span>
        `;
        recentAchievements.appendChild(div);
    });
}

// 結束遊戲
function endGame() {
    gameState.isPlaying = false;
    
    const gameOver = document.querySelector('.game-over');
    const finalStats = gameOver.querySelector('.final-stats');
    
    finalStats.innerHTML = `
        <p>最終分數: ${Math.round(gameState.score)}</p>
        <p>最高連擊: ${gameState.streak}</p>
        <p>解鎖成就: ${gameState.achievements.length}個</p>
    `;
    
    gameOver.style.display = 'flex';
}

// 重新開始遊戲
document.querySelector('.restart-btn').onclick = () => {
    document.querySelector('.game-over').style.display = 'none';
    initGame();
};

// 開始遊戲
initGame(); 