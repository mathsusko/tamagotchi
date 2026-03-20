/**
 * 🐾 PIXEL PET — Sistema Tamagotchi Gamificado
 * =============================================
 * Componente React autossuficiente com:
 * - Pet pixel art animado (idle + walk + estados)
 * - Movimento orgânico pela tela
 * - Sistema de status (fome, energia, felicidade, higiene)
 * - Popover de ações ao hover/click
 * - Painel de controle estilo arcade
 * - Persistência com localStorage
 * - Sistema de tick temporal
 *
 * Para usar em Next.js: adicione 'use client' no topo do arquivo.
 * Dependências: apenas React (sem framer-motion, sem zustand).
 */

import { useState, useEffect, useRef, useCallback, useReducer } from "react";

// ─────────────────────────────────────────────
// 🎨 PIXEL ART — renderizado via canvas + CSS
// O pet é desenhado com divs pixel a pixel
// ─────────────────────────────────────────────

// Grade 16x16 para cada frame (0 = transparente, 1..N = cor)
const COLORS = {
  1: "#f9c74f", // corpo amarelo
  2: "#f3722c", // detalhes laranja
  3: "#ffffff", // branco (olhos)
  4: "#000000", // preto (pupila, outline)
  5: "#f8961e", // orelhas
  6: "#43aa8b", // dormindo (verde)
  7: "#577590", // triste (azul)
  8: "#f94144", // vermelho (bochechas)
  9: "#adb5bd", // cinza
};

// Frame idle normal (16x16)
const FRAME_IDLE = [
  [0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],
  [0,0,0,4,4,1,1,1,1,1,1,4,4,0,0,0],
  [0,0,4,1,1,1,1,1,1,1,1,1,1,4,0,0],
  [0,4,1,1,5,1,1,1,1,1,1,5,1,1,4,0],
  [0,4,1,5,5,1,1,1,1,1,1,5,5,1,4,0],
  [4,1,1,1,1,3,3,1,1,3,3,1,1,1,1,4],
  [4,1,1,1,1,3,4,1,1,3,4,1,1,1,1,4],
  [4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4],
  [4,1,1,1,1,1,4,4,4,4,1,1,1,1,1,4],
  [4,1,8,1,1,1,1,1,1,1,1,1,1,8,1,4],
  [0,4,1,1,1,1,1,1,1,1,1,1,1,1,4,0],
  [0,0,4,1,1,1,1,1,1,1,1,1,1,4,0,0],
  [0,0,0,4,4,1,1,4,4,1,1,4,4,0,0,0],
  [0,0,0,0,4,1,4,0,0,4,1,4,0,0,0,0],
  [0,0,0,0,4,4,4,0,0,4,4,4,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Frame walk (pernas alternadas)
const FRAME_WALK1 = [
  [0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],
  [0,0,0,4,4,1,1,1,1,1,1,4,4,0,0,0],
  [0,0,4,1,1,1,1,1,1,1,1,1,1,4,0,0],
  [0,4,1,1,5,1,1,1,1,1,1,5,1,1,4,0],
  [0,4,1,5,5,1,1,1,1,1,1,5,5,1,4,0],
  [4,1,1,1,1,3,3,1,1,3,3,1,1,1,1,4],
  [4,1,1,1,1,3,4,1,1,3,4,1,1,1,1,4],
  [4,1,1,1,1,1,1,1,1,1,1,1,1,1,1,4],
  [4,1,1,1,1,1,4,4,4,4,1,1,1,1,1,4],
  [4,1,8,1,1,1,1,1,1,1,1,1,1,8,1,4],
  [0,4,1,1,1,1,1,1,1,1,1,1,1,1,4,0],
  [0,0,4,1,1,1,1,1,1,1,1,1,1,4,0,0],
  [0,0,0,4,4,1,4,4,1,1,1,1,4,0,0,0],
  [0,0,0,0,4,1,4,0,4,1,4,0,0,0,0,0],
  [0,0,0,0,4,4,4,0,4,4,4,0,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Frame triste (quando status baixo)
const FRAME_SAD = [
  [0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],
  [0,0,0,4,4,7,7,7,7,7,7,4,4,0,0,0],
  [0,0,4,7,7,7,7,7,7,7,7,7,7,4,0,0],
  [0,4,7,7,5,7,7,7,7,7,7,5,7,7,4,0],
  [0,4,7,5,5,7,7,7,7,7,7,5,5,7,4,0],
  [4,7,7,7,7,3,3,7,7,3,3,7,7,7,7,4],
  [4,7,7,7,4,3,7,7,7,3,7,4,7,7,7,4],
  [4,7,7,7,7,7,7,7,7,7,7,7,7,7,7,4],
  [4,7,7,7,7,7,7,4,4,7,7,7,7,7,7,4],
  [4,7,7,7,7,7,4,4,4,4,7,7,7,7,7,4],
  [0,4,7,7,7,7,7,7,7,7,7,7,7,7,4,0],
  [0,0,4,7,7,7,7,7,7,7,7,7,7,4,0,0],
  [0,0,0,4,4,7,7,4,4,7,7,4,4,0,0,0],
  [0,0,0,0,4,7,4,0,0,4,7,4,0,0,0,0],
  [0,0,0,0,4,4,4,0,0,4,4,4,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// Frame dormindo
const FRAME_SLEEP = [
  [0,0,0,0,0,4,4,4,4,4,4,0,0,0,0,0],
  [0,0,0,4,4,6,6,6,6,6,6,4,4,0,0,0],
  [0,0,4,6,6,6,6,6,6,6,6,6,6,4,0,0],
  [0,4,6,6,5,6,6,6,6,6,6,5,6,6,4,0],
  [0,4,6,5,5,6,6,6,6,6,6,5,5,6,4,0],
  [4,6,6,6,6,4,4,6,6,4,4,6,6,6,6,4],
  [4,6,6,6,6,6,6,6,6,6,6,6,6,6,6,4],
  [4,6,6,6,6,6,6,6,6,6,6,6,6,6,6,4],
  [4,6,6,6,6,6,4,4,4,4,6,6,6,6,6,4],
  [4,6,6,6,6,6,6,6,6,6,6,6,6,6,6,4],
  [0,4,6,6,6,6,6,6,6,6,6,6,6,6,4,0],
  [0,0,4,6,6,6,6,6,6,6,6,6,6,4,0,0],
  [0,0,0,4,4,6,6,4,4,6,6,4,4,0,0,0],
  [0,0,0,0,4,6,4,0,0,4,6,4,0,0,0,0],
  [0,0,0,0,4,4,4,0,0,4,4,4,0,0,0,0],
  [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
];

// ─────────────────────────────────────────────
// 🗃️ ESTADO INICIAL E REDUCER
// ─────────────────────────────────────────────

const INITIAL_STATUS = { fome: 80, energia: 80, felicidade: 80, higiene: 80 };

function loadFromStorage() {
  try {
    const saved = localStorage.getItem("pixelpet_status");
    return saved ? JSON.parse(saved) : INITIAL_STATUS;
  } catch { return INITIAL_STATUS; }
}

function statusReducer(state, action) {
  let next;
  switch (action.type) {
    case "FEED":
      next = { ...state, fome: Math.min(100, state.fome + 30) };
      break;
    case "PLAY":
      next = { ...state, felicidade: Math.min(100, state.felicidade + 30), energia: Math.max(0, state.energia - 10) };
      break;
    case "SLEEP":
      next = { ...state, energia: Math.min(100, state.energia + 40) };
      break;
    case "CLEAN":
      next = { ...state, higiene: Math.min(100, state.higiene + 40) };
      break;
    case "TICK":
      next = {
        fome: Math.max(0, state.fome - 1.5),
        energia: Math.max(0, state.energia - 1),
        felicidade: Math.max(0, state.felicidade - 1),
        higiene: Math.max(0, state.higiene - 0.8),
      };
      break;
    default:
      return state;
  }
  try { localStorage.setItem("pixelpet_status", JSON.stringify(next)); } catch {}
  return next;
}

// ─────────────────────────────────────────────
// 🖼️ COMPONENTE: PixelFrame (renderiza grid)
// ─────────────────────────────────────────────

function PixelFrame({ grid, scale = 3 }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(16, ${scale}px)`, lineHeight: 0, imageRendering: "pixelated" }}>
      {grid.map((row, y) =>
        row.map((cell, x) => (
          <div
            key={`${y}-${x}`}
            style={{
              width: scale,
              height: scale,
              background: cell === 0 ? "transparent" : COLORS[cell] || "transparent",
            }}
          />
        ))
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 🐾 COMPONENTE: Pet (sprite + movimento)
// ─────────────────────────────────────────────

function Pet({ status, onAction, onHover, onLeave, petRef, petPos }) {
  const [frame, setFrame] = useState(0); // 0=idle, 1=walk1
  const [isSleeping, setIsSleeping] = useState(false);

  const isSad = Object.values(status).some(v => v < 25);
  const isAsleep = status.energia < 15 || isSleeping;

  // Alterna frame de animação
  useEffect(() => {
    const interval = setInterval(() => setFrame(f => (f + 1) % 2), 400);
    return () => clearInterval(interval);
  }, []);

  const getFrame = () => {
    if (isAsleep) return FRAME_SLEEP;
    if (isSad) return FRAME_SAD;
    return frame === 0 ? FRAME_IDLE : FRAME_WALK1;
  };

  return (
    <div
      ref={petRef}
      style={{
        position: "fixed",
        left: petPos.x,
        top: petPos.y,
        zIndex: 9999,
        cursor: "pointer",
        transition: "filter 0.2s",
        filter: isSad ? "drop-shadow(0 0 6px #577590)" : "drop-shadow(0 0 4px #f9c74f88)",
        userSelect: "none",
      }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onAction}
    >
      <PixelFrame grid={getFrame()} scale={3} />
      {/* ZZZ dormindo */}
      {isAsleep && (
        <div style={{
          position: "absolute", top: -16, right: -8,
          fontFamily: "'Press Start 2P', monospace",
          fontSize: 10, color: "#43aa8b", animation: "zzzFloat 1.5s infinite"
        }}>z</div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// 💬 COMPONENTE: Popover de ações
// ─────────────────────────────────────────────

const ACTIONS = [
  { key: "FEED",  icon: "🍖", label: "Alimentar" },
  { key: "PLAY",  icon: "🎮", label: "Brincar" },
  { key: "SLEEP", icon: "😴", label: "Dormir" },
  { key: "CLEAN", icon: "🧼", label: "Limpar" },
];

function Popover({ visible, petPos, onAction, feedback }) {
  if (!visible) return null;

  const style = {
    position: "fixed",
    left: petPos.x + 58,
    top: petPos.y - 10,
    zIndex: 10000,
    background: "#0a0a0f",
    border: "3px solid #f9c74f",
    padding: "10px 12px",
    boxShadow: "4px 4px 0 #f9c74f44, inset 0 0 20px #f9c74f11",
    minWidth: 140,
    fontFamily: "'Press Start 2P', monospace",
  };

  return (
    <div style={style}>
      <div style={{ fontSize: 7, color: "#f9c74f", marginBottom: 8, letterSpacing: 1 }}>— AÇÕES —</div>
      {ACTIONS.map(a => (
        <button
          key={a.key}
          onClick={() => onAction(a.key)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: feedback === a.key ? "#f9c74f22" : "transparent",
            border: "none", color: feedback === a.key ? "#f9c74f" : "#aaa",
            fontFamily: "'Press Start 2P', monospace",
            fontSize: 8, padding: "5px 4px", width: "100%",
            cursor: "pointer", transition: "color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#f9c74f"}
          onMouseLeave={e => e.currentTarget.style.color = feedback === a.key ? "#f9c74f" : "#aaa"}
        >
          <span style={{ fontSize: 14 }}>{a.icon}</span> {a.label}
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────
// 📊 COMPONENTE: Barra de status
// ─────────────────────────────────────────────

function StatusBar({ label, value, color }) {
  const pct = Math.round(value);
  const isLow = pct < 25;
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 7, color: "#aaa", marginBottom: 3, fontFamily: "'Press Start 2P', monospace" }}>
        <span>{label}</span>
        <span style={{ color: isLow ? "#f94144" : "#f9c74f" }}>{pct}</span>
      </div>
      <div style={{ height: 8, background: "#1a1a2e", border: "2px solid #333", position: "relative", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          background: isLow ? "#f94144" : color,
          transition: "width 0.4s ease, background 0.4s",
          boxShadow: isLow ? `0 0 6px #f94144` : `0 0 6px ${color}88`,
        }} />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 🕹️ COMPONENTE: Painel de controle arcade
// ─────────────────────────────────────────────

function ControlPanel({ onMove, onAction, status }) {
  const btnStyle = (active) => ({
    width: 36, height: 36,
    background: active ? "#f9c74f22" : "#0a0a1a",
    border: `2px solid ${active ? "#f9c74f" : "#333"}`,
    color: "#f9c74f",
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 14, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    transition: "all 0.1s",
    userSelect: "none",
    boxShadow: active ? "0 0 8px #f9c74f55" : "none",
  });

  const actionBtnStyle = (color) => ({
    width: 38, height: 38,
    background: "#0a0a1a",
    border: `2px solid ${color}`,
    color: color,
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 16, cursor: "pointer",
    borderRadius: 2,
    transition: "all 0.1s",
    userSelect: "none",
  });

  return (
    <div style={{
      position: "fixed", bottom: 20, right: 20, zIndex: 10001,
      background: "#06060f",
      border: "3px solid #f9c74f",
      padding: "14px 16px",
      boxShadow: "6px 6px 0 #f9c74f44, inset 0 0 30px #f9c74f08",
      fontFamily: "'Press Start 2P', monospace",
      minWidth: 230,
    }}>
      {/* Header */}
      <div style={{ fontSize: 7, color: "#f9c74f", textAlign: "center", marginBottom: 12, letterSpacing: 2 }}>
        ▓ PIXEL PET ▓
      </div>

      {/* Status bars */}
      <div style={{ marginBottom: 14 }}>
        <StatusBar label="🍖 Fome"       value={status.fome}       color="#f9c74f" />
        <StatusBar label="⚡ Energia"    value={status.energia}     color="#43aa8b" />
        <StatusBar label="😊 Feliz."     value={status.felicidade}  color="#f8961e" />
        <StatusBar label="🧼 Higiene"    value={status.higiene}     color="#577590" />
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {/* D-Pad */}
        <div>
          <div style={{ fontSize: 7, color: "#555", marginBottom: 6, letterSpacing: 1 }}>MOVER</div>
          <div style={{ display: "grid", gridTemplateColumns: "36px 36px 36px", gridTemplateRows: "36px 36px 36px", gap: 2 }}>
            <div />
            <button style={btnStyle()} onMouseDown={() => onMove("up")}   title="Cima">▲</button>
            <div />
            <button style={btnStyle()} onMouseDown={() => onMove("left")} title="Esquerda">◀</button>
            <div style={{ background: "#111", border: "2px solid #222", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 6, height: 6, background: "#333" }} />
            </div>
            <button style={btnStyle()} onMouseDown={() => onMove("right")} title="Direita">▶</button>
            <div />
            <button style={btnStyle()} onMouseDown={() => onMove("down")} title="Baixo">▼</button>
            <div />
          </div>
        </div>

        {/* Action buttons */}
        <div>
          <div style={{ fontSize: 7, color: "#555", marginBottom: 6, letterSpacing: 1 }}>AÇÕES</div>
          <div style={{ display: "grid", gridTemplateColumns: "38px 38px", gap: 4 }}>
            <button style={actionBtnStyle("#f9c74f")} onClick={() => onAction("FEED")}  title="Alimentar">🍖</button>
            <button style={actionBtnStyle("#f8961e")} onClick={() => onAction("PLAY")}  title="Brincar">🎮</button>
            <button style={actionBtnStyle("#43aa8b")} onClick={() => onAction("SLEEP")} title="Dormir">😴</button>
            <button style={actionBtnStyle("#577590")} onClick={() => onAction("CLEAN")} title="Limpar">🧼</button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ fontSize: 6, color: "#333", textAlign: "center", marginTop: 12, letterSpacing: 1 }}>
        INSERT COIN ▓▓▓▓▓▓▓▓▓▓
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// 🏠 COMPONENTE PRINCIPAL: PixelPetSystem
// ─────────────────────────────────────────────

export default function PixelPetSystem() {
  // Estado de posição do pet
  const [petPos, setPetPos] = useState({ x: 200, y: 200 });
  // Target de movimento orgânico
  const targetPos = useRef({ x: 200, y: 200 });
  const animRef = useRef(null);
  const petRef = useRef(null);

  // Estado de UI
  const [showPopover, setShowPopover] = useState(false);
  const [feedback, setFeedback] = useState(null); // última ação executada
  const popoverTimeout = useRef(null);

  // Sistema de status via reducer
  const [status, dispatch] = useReducer(statusReducer, null, loadFromStorage);

  // Direção do pet (para flip horizontal)
  const [facingRight, setFacingRight] = useState(true);

  // ── TICK TEMPORAL (a cada 5s reduz status) ──
  useEffect(() => {
    const tick = setInterval(() => dispatch({ type: "TICK" }), 5000);
    return () => clearInterval(tick);
  }, []);

  // ── MOVIMENTO ORGÂNICO (requestAnimationFrame) ──
  useEffect(() => {
    // A cada N segundos sorteia novo destino
    const pickTarget = () => {
      const margin = 80;
      const maxX = window.innerWidth - margin;
      const maxY = window.innerHeight - margin;
      const nx = Math.random() * (maxX - margin) + margin;
      const ny = Math.random() * (maxY - margin) + margin;
      targetPos.current = { x: nx, y: ny };
    };
    pickTarget();
    const wander = setInterval(pickTarget, 4000);

    // Loop de animação com easing suave
    let current = { x: 200, y: 200 };
    const EASE = 0.035;

    const loop = () => {
      const dx = targetPos.current.x - current.x;
      const dy = targetPos.current.y - current.y;
      current.x += dx * EASE;
      current.y += dy * EASE;

      // Flip horizontal baseado na direção
      if (Math.abs(dx) > 1) setFacingRight(dx > 0);

      setPetPos({ x: Math.round(current.x), y: Math.round(current.y) });
      animRef.current = requestAnimationFrame(loop);
    };
    animRef.current = requestAnimationFrame(loop);

    return () => {
      clearInterval(wander);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  // ── MOVER via D-Pad ──
  const handleMove = useCallback((dir) => {
    const STEP = 60;
    const t = targetPos.current;
    const margin = 60;
    const maxX = window.innerWidth - margin;
    const maxY = window.innerHeight - margin;

    if (dir === "up")    targetPos.current = { ...t, y: Math.max(margin, t.y - STEP) };
    if (dir === "down")  targetPos.current = { ...t, y: Math.min(maxY, t.y + STEP) };
    if (dir === "left")  targetPos.current = { ...t, x: Math.max(margin, t.x - STEP) };
    if (dir === "right") targetPos.current = { ...t, x: Math.min(maxX, t.x + STEP) };
  }, []);

  // ── EXECUTAR AÇÃO ──
  const handleAction = useCallback((type) => {
    dispatch({ type });
    setFeedback(type);
    setTimeout(() => setFeedback(null), 1200);
    // Som sintético via AudioContext
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = type === "FEED" ? 440 : type === "PLAY" ? 520 : type === "SLEEP" ? 330 : 480;
      osc.type = "square";
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(); osc.stop(ctx.currentTime + 0.25);
    } catch {}
  }, []);

  // ── POPOVER hover/click ──
  const handleHover = useCallback(() => {
    clearTimeout(popoverTimeout.current);
    setShowPopover(true);
  }, []);
  const handleLeave = useCallback(() => {
    popoverTimeout.current = setTimeout(() => setShowPopover(false), 600);
  }, []);
  const handlePetClick = useCallback(() => {
    setShowPopover(v => !v);
  }, []);

  return (
    <>
      {/* Fonte pixel */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        @keyframes zzzFloat {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-14px) scale(1.4); opacity: 0; }
        }
        @keyframes popIn {
          0% { transform: scale(0.7); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Pet sprite */}
      <div style={{ transform: facingRight ? "scaleX(1)" : "scaleX(-1)", transition: "transform 0.15s" }}>
        <Pet
          status={status}
          petPos={petPos}
          petRef={petRef}
          onHover={handleHover}
          onLeave={handleLeave}
          onAction={handlePetClick}
        />
      </div>

      {/* Popover de ações */}
      <div
        onMouseEnter={() => clearTimeout(popoverTimeout.current)}
        onMouseLeave={handleLeave}
      >
        <Popover
          visible={showPopover}
          petPos={petPos}
          onAction={(type) => { handleAction(type); }}
          feedback={feedback}
        />
      </div>

      {/* Painel de controle */}
      <ControlPanel onMove={handleMove} onAction={handleAction} status={status} />
    </>
  );
}
