"use client";
import React from "react";

export default function AuroraLoader({ logoUrl = "https://i.postimg.cc/VNztnW3h/image.png", size = 180 }: { logoUrl?: string; size?: number }) {
  const s = Number(size);
  return (
    <div className="aurora-root" aria-label="Loading" role="status">
      <div className="aurora" />

      <div className="loader" style={{ width: s, height: s }}>
        <div className="shape" style={{ width: Math.round(s * 0.9), height: Math.round(s * 0.9) }} />
        <img className="logo" src={logoUrl} alt="logo" decoding="async" loading="eager" />
      </div>

      <style>{`
        :root{ --size: ${s}px }
        .aurora-root{ position:relative; display:grid; place-items:center; width:100%; height:100vh; background: radial-gradient(ellipse at center, #020b1a 0%, #000 60%); overflow:hidden }
        .aurora{ position:absolute; inset:-20%; width:140%; height:140%; background: conic-gradient(from 0deg, rgba(0,160,255,0.06), rgba(0,120,255,0.05), rgba(0,220,255,0.07)); filter: blur(80px); mix-blend-mode: screen; animation: auroraRotate 20s linear infinite; z-index:0 }
        @keyframes auroraRotate{ to { transform: rotate(360deg) } }
        .loader{ position:relative; z-index:2; display:flex; align-items:center; justify-content:center; transform-origin:center; animation: loaderSpin 6s linear infinite; width: var(--size); height: var(--size) }
        @keyframes loaderSpin{ to { transform: rotate(360deg) } }
        .shape{ position:absolute; inset:0; margin:auto; z-index:1; width: calc(var(--size) * 0.9); height: calc(var(--size) * 0.9); border: 4px solid rgba(0,170,255,0.18); display:flex; align-items:center; justify-content:center; background: linear-gradient(135deg, rgba(0,170,255,0.06), rgba(40,120,255,0.03)); box-shadow: 0 8px 30px rgba(0,140,255,0.12), inset 0 0 20px rgba(0,140,255,0.06); will-change: clip-path, transform; animation: morph 12s ease-in-out infinite }
        .logo{ position:relative; z-index:3; width: calc(var(--size) * 0.45); height: calc(var(--size) * 0.45); object-fit: contain; border-radius:8px; padding:6px; background: rgba(3,6,12,0.35); box-shadow: 0 6px 30px rgba(0,185,255,0.18), 0 0 40px rgba(30,60,255,0.08); transform-origin:center; will-change: transform, filter; animation: logoPulse 2.6s ease-in-out infinite }
        @keyframes logoPulse{ 0%,100%{ transform: scale(1); filter: drop-shadow(0 0 12px rgba(0,170,255,0.25)); } 50%{ transform: scale(1.06); filter: drop-shadow(0 0 28px rgba(0,200,255,0.35)); } }
        @keyframes morph{ 0%{ clip-path: circle(50% at 50% 50%); transform: rotate(0deg) } 16%{ clip-path: inset(0% round 10%); transform: rotate(90deg) } 33%{ clip-path: polygon(50% 0%, 0% 100%, 100% 100%); transform: rotate(180deg) } 50%{ clip-path: polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%); transform: rotate(270deg) } 66%{ clip-path: inset(0% round 25%); transform: rotate(360deg) } 100%{ clip-path: circle(50% at 50% 50%); transform: rotate(360deg) } }
        .aurora-root::after{ content:''; position:absolute; z-index:0; inset:0; pointer-events:none; background: radial-gradient(circle at 50% 45%, rgba(0,170,255,0.16), transparent 35%); filter: blur(30px); transform-origin:center; animation: lightPulse 6s ease-in-out infinite }
        @keyframes lightPulse{ 0%{ transform: scale(1); opacity:0.9 } 50%{ transform: scale(1.06); opacity:1 } 100%{ transform: scale(1); opacity:0.9 } }
        @media (prefers-reduced-motion: reduce){ .shape, .loader, .aurora, .aurora-root::after, .logo{ animation:none !important } }
      `}</style>
    </div>
  );
}
