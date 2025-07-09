// frontend/src/components/game/PokerTable.js

import React, { useState } from 'react';
import { aiSmartSplit, getPlayerSmartSplits } from '../../utils/ai/SmartSplit';
import { calcSSSAllScores, isFoul } from '../../utils/game/sssScore';
import { getShuffledDeck, dealHands } from '../../utils/game/DealCards';
import './Play.css';

const AI_NAMES = ['小明', '小红', '小刚'];

const OUTER_MAX_WIDTH = 420;
const PAI_DUN_HEIGHT = 133;
const CARD_HEIGHT = Math.round(PAI_DUN_HEIGHT * 0.94);
const CARD_WIDTH = Math.round(CARD_HEIGHT * 46 / 66);

// 接受 onExit 回调函数用于退出
export default function PokerTable({ onExit }) {
  const [head, setHead] = useState([]);
  const [middle, setMiddle] = useState([]);
  const [tail, setTail] = useState([]);
  const [selected, setSelected] = useState({ area: '', cards: [] });
  const [msg, setMsg] = useState('');
  const [aiPlayers, setAiPlayers] = useState([
    { name: AI_NAMES[0], isAI: true, cards13: [], head: [], middle: [], tail: [], processed: false },
    { name: AI_NAMES[1], isAI: true, cards13: [], head: [], middle: [], tail: [], processed: false },
    { name: AI_NAMES[2], isAI: true, cards13: [], head: [], middle: [], tail: [], processed: false },
  ]);
  const [showResult, setShowResult] = useState(false);
  const [scores, setScores] = useState([0,0,0,0]);
  const [isReady, setIsReady] = useState(false);
  const [hasCompared, setHasCompared] = useState(false);
  const [foulStates, setFoulStates] = useState([false, false, false, false]);
  const [mySplits, setMySplits] = useState([]);
  const [splitIndex, setSplitIndex] = useState(0);
  const [aiProcessed, setAiProcessed] = useState([false, false, false]);

  function handleReady() {
    if (!isReady) {
      const deck = getShuffledDeck();
      const [myHand, ...aiHands] = dealHands(deck);
      setHead(myHand.slice(0, 3));
      setMiddle(myHand.slice(3, 8));
      setTail(myHand.slice(8, 13));
      setIsReady(true);
      setHasCompared(false);
      setMsg('');
      setShowResult(false);
      setScores([0,0,0,0]);
      setSelected({ area: '', cards: [] });
      setFoulStates([false, false, false, false]);
      setMySplits([]); setSplitIndex(0);
      setAiProcessed([false, false, false]);
      setAiPlayers([
        { name: AI_NAMES[0], isAI: true, cards13: aiHands[0], head: aiHands[0].slice(0,3), middle: aiHands[0].slice(3,8), tail: aiHands[0].slice(8,13), processed: false },
        { name: AI_NAMES[1], isAI: true, cards13: aiHands[1], head: aiHands[1].slice(0,3), middle: aiHands[1].slice(3,8), tail: aiHands[1].slice(8,13), processed: false },
        { name: AI_NAMES[2], isAI: true, cards13: aiHands[2], head: aiHands[2].slice(0,3), middle: aiHands[2].slice(3,8), tail: aiHands[2].slice(8,13), processed: false },
      ]);
      setTimeout(() => {
        const splits = getPlayerSmartSplits(myHand);
        setMySplits(splits);
        setSplitIndex(0);
      }, 0);
      aiHands.forEach((hand, idx) => {
        setTimeout(() => {
          setAiPlayers(old => {
            const newAis = [...old];
            const split = aiSmartSplit(hand);
            newAis[idx] = { ...newAis[idx], ...split, processed: true };
            return newAis;
          });
          setAiProcessed(proc => {
            const arr = [...proc];
            arr[idx] = true;
            return arr;
          });
        }, 400 + idx * 350);
      });
    } else {
      setHead([]); setMiddle([]); setTail([]);
      setAiPlayers([
        { name: AI_NAMES[0], isAI: true, cards13: [], head: [], middle: [], tail: [], processed: false },
        { name: AI_NAMES[1], isAI: true, cards13: [], head: [], middle: [], tail: [], processed: false },
        { name: AI_NAMES[2], isAI: true, cards13: [], head: [], middle: [], tail: [], processed: false },
      ]);
      setIsReady(false);
      setHasCompared(false);
      setMsg('');
      setShowResult(false);
      setScores([0,0,0,0]);
      setSelected({ area: '', cards: [] });
      setFoulStates([false, false, false, false]);
      setMySplits([]); setSplitIndex(0);
      setAiProcessed([false, false, false]);
    }
  }

  function handleCardClick(card, area, e) {
    e.stopPropagation();
    setSelected(prev => {
      if (prev.area !== area) return { area, cards: [card] };
      const isSelected = prev.cards.includes(card);
      let nextCards;
      if (isSelected) {
        nextCards = prev.cards.filter(c => c !== card);
      } else {
        nextCards = [...prev.cards, card];
      }
      return { area, cards: nextCards };
    });
  }

  function moveTo(dest) {
    if (!selected.cards.length) return;
    let newHead = [...head], newMiddle = [...middle], newTail = [...tail];
    const from = selected.area;
    if (from === 'head') newHead = newHead.filter(c => !selected.cards.includes(c));
    if (from === 'middle') newMiddle = newMiddle.filter(c => !selected.cards.includes(c));
    if (from === 'tail') newTail = newTail.filter(c => !selected.cards.includes(c));
    if (dest === 'head') newHead = [...newHead, ...selected.cards];
    if (dest === 'middle') newMiddle = [...newMiddle, ...selected.cards];
    if (dest === 'tail') newTail = [...newTail, ...selected.cards];
    setHead(newHead); setMiddle(newMiddle); setTail(newTail);
    setSelected({ area: dest, cards: [] });
    setMsg('');
  }

  function handleSmartSplit() {
    if (!mySplits.length) {
      setMsg('智能分牌计算中，请稍候…');
      return;
    }
    const nextIdx = (splitIndex + 1) % mySplits.length;
    setSplitIndex(nextIdx);
    const split = mySplits[nextIdx];
    setHead(split.head);
    setMiddle(split.middle);
    setTail(split.tail);
    setMsg(`已切换智能分牌方案 ${nextIdx + 1}/${mySplits.length}`);
  }

  function handleStartCompare() {
    if (aiProcessed.some(p => !p)) {
      setMsg('请等待所有玩家提交理牌');
      return;
    }
    if (head.length !== 3 || middle.length !== 5 || tail.length !== 5) {
      setMsg('请按 3-5-5 张分配');
      return;
    }
    const allPlayers = [
      { name: '你', head, middle, tail },
      ...aiPlayers.map(ai => ({ name: ai.name, head: ai.head, middle: ai.middle, tail: ai.tail }))
    ];
    const resScores = calcSSSAllScores(allPlayers);
    const fouls = allPlayers.map(p => isFoul(p.head, p.middle, p.tail));
    setScores(resScores);
    setFoulStates(fouls);
    setShowResult(true);
    setHasCompared(true);
    setMsg('');
    setIsReady(false);
  }

  function renderPlayerSeat(name, idx, isMe) {
    const aiDone = idx > 0 ? aiProcessed[idx - 1] : false;
    return (
      <div
        key={name}
        className="play-seat"
        style={{
          border: 'none',
          borderRadius: 1 CARD_WIDTH) / 3);
    if (arr.length > 1) {
      const totalWidth = (cardSize?.width ?? CARD_WIDTH) + (arr.length - 1) * overlap;
      if (totalWidth > maxWidth) {
        overlap = Math.floor((maxWidth - (cardSize?.width ?? CARD_WIDTH)) / (arr.length - 1));
      }
    }
    let lefts = [];
    let startX = 0;
    for (let i = 0; i < arr.length; ++i) { lefts.push(startX + i * overlap); }
    return (
      <div style={{
        position: 'relative', height: cardSize?.height ?? PAI_DUN_HEIGHT,
        width: '100%', minWidth: 0, boxSizing: 'border-box', overflow: 'visible'
      }}>
        {arr.map((card, idx) => {
          const isSelected = selected.area === area && selected.cards.includes(card);
          return (
            <img
              key={card}
              // ✅ 牌面图片路径正确无误，因为 DealCards.js 生成的牌名与图片文件名一致
              src={`/cards/${card}.svg`}
              alt={card}
              className="card-img"
              style={{
                position: 'absolute', left: lefts[idx], top: ((cardSize?.height ?? PAI_DUN_HEIGHT) - (cardSize?.height ?? CARD_HEIGHT)) / 2,
                zIndex: idx, width: cardSize?.width ?? CARD_WIDTH, height: cardSize?.height ?? CARD_HEIGHT,
                borderRadius: 5, border: isSelected ? '2.5px solid #ff4444' : 'none',
                boxShadow: isSelected ? '0 0 16px 2px #ff4444cc' : 'none',
                cursor: isReady ? 'pointer' : 'not-allowed', background: '#fff',
                transition: 'border .13s, box-shadow .13s'
              }}
              onClick={e => { if (isReady) handleCardClick(card, area, e); }}
              draggable={false}
            />
          );
        })}
      </div>
    );
  }

  function renderPaiDun(arr, label, area, color) {
    // ... 此函数无需修改
    return (
      <div style={{...}} onClick={() => { if (isReady) moveTo(area); }}>
         {/* ... 内部代码 ... */}
      </div>
    );
  }

  function renderResultModal() {
    // ... 此函数无需修改
    if (!showResult) return null;
    return (
      <div style={{...}}>
          {/* ... 内部代码 ... */}
      </div>
    );
  }

  return (
    <div style={{ background: '#164b2e', minHeight: '100vh', fontFamily: 'inherit' }}>
      <div style={{
        maxWidth: OUTER_MAX_WIDTH, width: '100%', margin: '30px auto', background: '#185a30',
        borderRadius: 22, boxShadow: "0 4px 22px #23e67a44, 0 1.5px 5px #1a462a6a",
        padding: 16, border: 'none', position: 'relative', display: 'flex', flexDirection: 'column',
        minHeight: 650, boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
          {/* ✅ “退出房间”按钮调用从 App.js 传入的 onExit 函数 */}
          <button
            style={{
              background: 'linear-gradient(90deg,#fff 60%,#e0fff1 100%)', color: '#234', fontWeight: 'bold',
              border: 'none', borderRadius: 9, padding: '7px 22px', cursor: 'pointer', marginRight: 18, fontSize: 17,
              boxShadow: '0 1.5px 6px #23e67a30'
            }}
            onClick={onExit}
          >
            < 退出房间
          </button>
          <div style={{
            flex: 1, textAlign: 'right', color: '#23e67a', fontWeight: 900, fontSize: 21,
            letterSpacing: 2, marginRight: 8, textShadow: '0 2px 7px #23e67a44'
          }}>
            <span role="img" aria-label="coin" style={{ fontSize: 18, marginRight: 4 }}>🪙</span>
            积分：100
          </div>
        </div>
        <div style={{ display: 'flex', marginBottom: 18, gap: 8 }}>
          {renderPlayerSeat('你', 0, true)}
          {aiPlayers.map((ai, idx) => renderPlayerSeat(ai.name, idx + 1, false))}
        </div>
        {renderPaiDun(head, '头道', 'head', '#23e67a')}
        {renderPaiDun(middle, '中道', 'middle', '#23e67a')}
        {renderPaiDun(tail, '尾道', 'tail', '#23e67a')}
        <div style={{ display: 'flex', gap: 12, marginBottom: 0, marginTop: 14 }}>
          <button
            style={{...}}
            onClick={handleReady}
          >{isReady ? '取消准备' : '准备'}</button>
          <button
            style={{...}}
            onClick={handleSmartSplit}
            disabled={!isReady}
          >智能分牌</button>
          <button
            style={{...}}
            onClick={isReady ? handleStartCompare : undefined}
            disabled={!isReady || aiProcessed.some(p=>!p)}
          >开始比牌</button>
        </div>
        <div style={{ color: '#c3e1d1', textAlign: 'center', fontSize: 16, marginTop: 8, minHeight: 24 }}>
          {msg}
        </div>
        {renderResultModal()}
      </div>
      <style>{`
        @media (max-width: 480px) {
          .play-seat { margin-right: 4px !important; width: 24% !important; min-width: 0 !important; }
          .card-img { width: ${Math.floor(CARD_WIDTH*0.92)}px !important; height: ${Math.floor(CARD_HEIGHT*0.92)}px !important; }
        }
      `}</style>
    </div>
  );
}
