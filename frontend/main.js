// --- 模块导入 --- 
import { renderLobby } from './src/components/lobby.js';

// 斗地主
import { renderGameBoard } from './src/components/game-board.js';
import { renderPlayerHand, updateCardCount, renderPlayedCards } from './src/components/card.js';
import { DouDizhuGame } from './src/game-logic/doudizhu-rules.js';
import { renderBiddingControls } from './src/components/bidding-ui.js';

// 锄大地 (待实现)
import { renderBigTwoBoard } from './src/components/big-two-ui.js';
import { BigTwoGame } from './src/game-logic/big-two-rules.js';

// 十三水 (待实现)
import { renderThirteenWaterBoard } from './src/components/thirteen-water-ui.js';
import { ThirteenWaterGame } from './src/game-logic/thirteen-water-rules.js';


// --- 全局变量 --- 
const app = document.getElementById('app');
let currentGame = null;

// --- 核心功能 ---

function showLobby() {
    app.innerHTML = renderLobby();
    document.querySelectorAll('.game-card').forEach(card => {
        const gameId = card.dataset.game;
        const trialBtn = card.querySelector('.lobby-btn.trial');
        const matchBtn = card.querySelector('.lobby-btn.match');

        if (trialBtn && !trialBtn.disabled) {
            trialBtn.addEventListener('click', () => startGame(gameId, 'offline'));
        }
        if (matchBtn && !matchBtn.disabled) {
            matchBtn.addEventListener('click', () => startGame(gameId, 'online'));
        }
    });
}

function startGame(gameId, mode) {
    if (mode === 'online') {
        alert('在线匹配模式正在火速开发中，敬请期待！');
        return;
    }

    switch (gameId) {
        case 'doudizhu':
            startDoudizhuOffline();
            break;
        case 'chudadi':
            startBigTwoOffline();
            break;
        case 'thirteen':
            startThirteenWaterOffline();
            break;
        default:
            alert('该游戏暂未开放！');
    }
}

// --- 游戏启动函数 ---

function startDoudizhuOffline() {
    currentGame = new DouDizhuGame(['您', '下家AI', '上家AI']);
    currentGame.startGame();
    
    app.innerHTML = renderGameBoard(currentGame.players);
    currentGame.players.forEach(p => {
        const isYou = p.id === 'player-0';
        renderPlayerHand(`hand-${p.id}`, p.hand, !isYou);
        updateCardCount(p.id, p.hand.length);
    });

    biddingLoop();
}

function startBigTwoOffline() {
    currentGame = new BigTwoGame();
    currentGame.startGame();
    app.innerHTML = renderBigTwoBoard();
    setTimeout(() => {
        alert("“锄大地”的核心玩法正在紧张开发中，即将呈现，敬请期待！");
        showLobby();
    }, 1000);
}

function startThirteenWaterOffline() {
    currentGame = new ThirteenWaterGame();
    currentGame.startGame();
    app.innerHTML = renderThirteenWaterBoard();
    setTimeout(() => {
        alert("“十三水”的核心玩法正在紧张开发中，即将呈现，敬请期待！");
        showLobby();
    }, 1000);
}


// --- 斗地主：叫地主循环 ---
function biddingLoop() {
    if (currentGame.gameState !== 'bidding') {
        finalizeDoudizhuBoard();
        return;
    }

    const currentPlayer = currentGame.getCurrentBiddingPlayer();
    updateUITurn(currentPlayer, 'bidding');

    const oldControls = document.getElementById('bidding-container') || document.querySelector('.bidding-status-indicator');
    if (oldControls) oldControls.remove();

    if (currentPlayer.id === 'player-0') {
        const container = document.querySelector('.player-area.bottom-center');
        container.insertAdjacentHTML('beforeend', renderBiddingControls(currentGame.highestBid));
        document.getElementById('bidding-container').addEventListener('click', handleDoudizhuBidClick);
    } else {
        updatePlayerStatus(currentPlayer.id, '叫分中...');
        setTimeout(() => {
            const oldBid = currentGame.highestBid;
            currentGame.aiSimpleBid(currentPlayer.id);
            const newBid = currentGame.highestBid;
            const bidText = (newBid > oldBid) ? `${newBid} 分` : '不叫';
            updatePlayerStatus(currentPlayer.id, bidText);
            biddingLoop();
        }, 1500);
    }
}

function handleDoudizhuBidClick(event) {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;

    const bid = parseInt(button.dataset.bid, 10);
    currentGame.playerBid('player-0', bid);
    
    document.getElementById('bidding-container').remove();
    const bidText = (bid > 0) ? `${bid} 分` : '不叫';
    updatePlayerStatus('player-0', bidText, true);

    setTimeout(biddingLoop, 100);
}

function finalizeDoudizhuBoard() {
    const landlord = currentGame.players.find(p => p.isLandlord);
    
    if (!landlord) {
        alert('流局，无人叫地主！即将重新发牌。');
        startDoudizhuOffline();
        return;
    }

    document.querySelectorAll('.player-pod').forEach(el => el.style.boxShadow = 'none');
    const landlordNameEl = document.querySelector(`#${landlord.id} .player-name`);
    landlordNameEl.innerHTML += ' <span style="color: var(--accent-color)">(地主)</span>';
    
    renderPlayedCards('landlord-cards-area', currentGame.landlordCards);
    renderPlayerHand(`hand-${landlord.id}`, landlord.hand, landlord.id !== 'player-0');
    updateCardCount(landlord.id, landlord.hand.length);
    
    const container = document.querySelector('.player-area.bottom-center');
    container.insertAdjacentHTML('beforeend', `
        <div id="play-buttons-container" class="action-buttons-container">
            <button id="pass-btn" class="action-btn pass" disabled>不要</button>
            <button id="play-btn" class="action-btn play" disabled>出牌</button>
        </div>
    `);
    document.getElementById('play-btn').addEventListener('click', handleDoudizhuPlay);
    document.getElementById('pass-btn').addEventListener('click', handleDoudizhuPass);

    doudizhuGameLoop();
}

// --- 斗地主：出牌游戏循环 ---
function doudizhuGameLoop() {
    if (currentGame.getWinner()) {
        endGame(currentGame.getWinner());
        return;
    }
    const currentPlayer = currentGame.getCurrentPlayingPlayer();
    updateUITurn(currentPlayer, 'playing');

    if (currentPlayer.id !== 'player-0') {
        setTimeout(doudizhuAiTurn, 1200);
    }
}

function handleDoudizhuPlay() {
    const selectedElements = document.querySelectorAll('#hand-player-0 .card.selected');
    if (selectedElements.length === 0) return;

    const cardIds = Array.from(selectedElements).map(el => el.dataset.cardId);
    const result = currentGame.playCards('player-0', cardIds);
    
    if (result) {
        renderPlayedCards('played-cards-area', result.playedCards);
        renderPlayerHand('player-0', currentGame.getPlayerById('player-0').hand, false);
        doudizhuGameLoop();
    } else {
        alert("出牌不符合规则！");
    }
}

function handleDoudizhuPass() {
    if (currentGame.passTurn('player-0')) {
        updatePlayerStatus('player-0', '不要', true);
        doudizhuGameLoop();
    } else {
        alert("轮到你首次出牌，不能不要！");
    }
}

function doudizhuAiTurn() {
    const aiPlayer = currentGame.getCurrentPlayingPlayer();
    const result = currentGame.aiSimplePlay(aiPlayer.id);

    if (result && result.playedCards) {
        renderPlayedCards('played-cards-area', result.playedCards);
        updatePlayerStatus(aiPlayer.id, '');
    } else {
        updatePlayerStatus(aiPlayer.id, '不要');
    }
    
    updateCardCount(aiPlayer.id, aiPlayer.hand.length);
    renderPlayerHand(`hand-${aiPlayer.id}`, aiPlayer.hand, true);
    doudizhuGameLoop();
}

// --- 通用结束和UI更新 ---
function endGame(winner) {
    setTimeout(() => {
        alert(`游戏结束！胜利者是 ${winner.name}！`);
        showLobby();
    }, 800);
}

function updatePlayerStatus(playerId, text, isYou = false) {
    if (isYou) {
        const oldStatus = document.querySelector('.bidding-status-indicator');
        if (oldStatus) oldStatus.remove();
        
        const container = document.querySelector('.player-area.bottom-center');
        container.insertAdjacentHTML('beforeend', `<div class="bidding-status-indicator">${text}</div>`);
        setTimeout(() => {
            const status = document.querySelector('.bidding-status-indicator');
            if (status) status.remove();
        }, 1000);
        return;
    }
    
    const statusEl = document.getElementById(`status-${playerId}`);
    if (statusEl) {
        statusEl.textContent = text;
        statusEl.classList.toggle('visible', !!text);
    }
}

function updateUITurn(player, phase) {
    document.querySelectorAll('.player-pod').forEach(el => {
        el.style.transform = 'scale(1)';
        el.style.boxShadow = '0 4px 15px var(--shadow-dark)';
    });

    const playerEl = document.getElementById(player.id);
    if (playerEl) {
        playerEl.style.transform = 'scale(1.03)';
        playerEl.style.boxShadow = `0 0 25px var(--accent-color)`;
    }

    if (phase === 'playing') {
        const isMyTurn = player.id === 'player-0';
        const canPass = currentGame.lastValidPlay.playerId !== null && currentGame.passPlayCount < 2;
        document.getElementById('play-btn').disabled = !isMyTurn;
        document.getElementById('pass-btn').disabled = !isMyTurn || !canPass;
    }
}

// --- 应用初始化 ---
document.addEventListener('DOMContentLoaded', showLobby);
