import { useEffect, useMemo, useRef, useState } from "react";
import { buildChart, dancePreset, DanceJudge, type DanceConfig, type DanceEvent, type Lane } from "@party/shared";
import { serverNow } from "../../socket";
import { AVATAR_VIEW, avatarImage } from "../../avatars";
import { formatTime } from "../../format";
import { DanceAudio } from "./audio";
import type { MinigameProps } from "../types";

// O cliente roda o jogo localmente (sem depender da latência) com o MESMO juiz do servidor.
// O servidor recebe cada tecla (com o horário) e decide quem caiu e quando.
const W = 480, H = 620;
const REC_Y = 400, TOP_Y = -40, LANE_GAP = 88;
const laneX = (l: number) => W / 2 + (l - 1.5) * LANE_GAP;
const COLORS = ["#1cb0f6", "#58cc02", "#ffc800", "#ff6b6b"];   // ← ↓ ↑ →
const DARK = ["#1488bd", "#3f9a00", "#c99a00", "#c94a4a"];
const ROT = [-Math.PI / 2, Math.PI, 0, Math.PI / 2];            // a seta base aponta para cima
const LANE_FREQ = [392, 440, 523.25, 659.25];
const SCALE = [110, 130.8, 146.8, 164.8, 196, 220, 261.6, 293.7];
const KEYS: Record<string, Lane> = {
  ArrowLeft: 0, a: 0, A: 0, ArrowDown: 1, s: 1, S: 1, ArrowUp: 2, w: 2, W: 2, ArrowRight: 3, d: 3, D: 3,
};

type V2 = [number, number];
interface Limbs { lh: V2; rh: V2; lf: V2; rf: V2; dy: number; tilt: number }

function targetFor(pose: number, stumble: boolean, t: number): Limbs {
  if (stumble)
    return {
      lh: [-46 + Math.sin(t / 40) * 10, 8 + Math.cos(t / 35) * 14], rh: [46 + Math.cos(t / 45) * 10, 8 + Math.sin(t / 30) * 14],
      lf: [-24, 42], rf: [24, 42], dy: 0, tilt: Math.sin(t / 50) * 0.25,
    };
  switch (pose) {
    case 0: return { lh: [-64, -6], rh: [12, 24], lf: [-42, 38], rf: [12, 42], dy: 0, tilt: -0.12 };
    case 1: return { lh: [-38, 42], rh: [38, 42], lf: [-36, 40], rf: [36, 40], dy: 16, tilt: 0 };
    case 2: return { lh: [-44, -52], rh: [44, -52], lf: [-14, 34], rf: [14, 34], dy: -14, tilt: 0 };
    case 3: return { lh: [-12, 24], rh: [64, -6], lf: [-12, 42], rf: [42, 38], dy: 0, tilt: 0.12 };
    default: {
      const bob = Math.sin(t / 180) * 3;
      return { lh: [-30, 34 + bob], rh: [30, 34 - bob], lf: [-16, 42], rf: [16, 42], dy: bob, tilt: Math.sin(t / 360) * 0.04 };
    }
  }
}

function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function arrowPath(c: CanvasRenderingContext2D, x: number, y: number, s: number, rot: number) {
  const pts: V2[] = [[0, -s], [0.95 * s, 0.05 * s], [0.4 * s, 0.05 * s], [0.4 * s, 0.85 * s], [-0.4 * s, 0.85 * s], [-0.4 * s, 0.05 * s], [-0.95 * s, 0.05 * s]];
  const cos = Math.cos(rot), sin = Math.sin(rot);
  c.beginPath();
  pts.forEach(([px, py], i) => {
    const X = x + px * cos - py * sin, Y = y + px * sin + py * cos;
    if (i === 0) c.moveTo(X, Y); else c.lineTo(X, Y);
  });
  c.closePath();
}

function drawArrow(c: CanvasRenderingContext2D, lane: number, x: number, y: number, s: number, alpha: number) {
  c.globalAlpha = alpha;
  arrowPath(c, x, y, s, ROT[lane]);
  c.fillStyle = COLORS[lane];
  c.strokeStyle = DARK[lane];
  c.lineWidth = 7;
  c.lineJoin = "round";
  c.stroke();
  c.fill();
  c.globalAlpha = 1;
}

function heart(c: CanvasRenderingContext2D, x: number, y: number, s: number, filled: boolean) {
  c.beginPath();
  c.moveTo(x, y + s * 0.9);
  c.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.7, y - s * 1.2, x, y - s * 0.35);
  c.bezierCurveTo(x + s * 0.7, y - s * 1.2, x + s * 1.6, y - s * 0.2, x, y + s * 0.9);
  c.closePath();
  c.lineJoin = "round";
  c.lineWidth = 3;
  c.strokeStyle = "#ff6b6b";
  c.fillStyle = "#ff6b6b";
  if (filled) c.fill();
  c.stroke();
}

function drawDancer(c: CanvasRenderingContext2D, L: Limbs, emoji: string, bg: string, stumble: boolean, t: number, img?: HTMLImageElement) {
  const cx = W / 2, hipY = 566 + L.dy;
  c.fillStyle = "rgba(0,0,0,.28)";
  c.beginPath(); c.ellipse(cx, 612, 46, 8, 0, 0, Math.PI * 2); c.fill();

  c.save();
  c.translate(cx, hipY);
  c.rotate(L.tilt);
  c.lineCap = "round"; c.lineJoin = "round";
  const line = (x1: number, y1: number, x2: number, y2: number) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
  c.strokeStyle = "#1488bd"; c.lineWidth = 13;
  line(0, 0, L.lf[0], L.lf[1]);
  line(0, 0, L.rf[0], L.rf[1]);
  c.strokeStyle = "#1cb0f6"; c.lineWidth = 26;
  line(0, 0, 0, -50);
  c.strokeStyle = "#1488bd"; c.lineWidth = 12;
  line(0, -46, L.lh[0], -46 + L.lh[1]);
  line(0, -46, L.rh[0], -46 + L.rh[1]);
  c.fillStyle = "#ffc800";
  for (const f of [L.lf, L.rf]) { c.beginPath(); c.arc(f[0], f[1], 8, 0, Math.PI * 2); c.fill(); }
  for (const h of [L.lh, L.rh]) { c.beginPath(); c.arc(h[0], -46 + h[1], 7, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = bg;
  c.beginPath(); c.arc(0, -86, 34, 0, Math.PI * 2); c.fill();
  if (img && img.complete && img.naturalWidth > 0) {
    c.save();
    c.beginPath(); c.arc(0, -86, 34, 0, Math.PI * 2); c.clip();
    c.drawImage(img, -34, -120, 68, 68);
    c.restore();
  } else {
    c.font = "38px 'Segoe UI Emoji','Apple Color Emoji','Noto Color Emoji',system-ui,sans-serif";
    c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = "#000";
    c.fillText(emoji, 0, -84);
  }
  c.strokeStyle = "rgba(255,255,255,.3)"; c.lineWidth = 3;
  c.beginPath(); c.arc(0, -86, 34, 0, Math.PI * 2); c.stroke();
  c.restore();

  if (stumble) {
    c.fillStyle = "#ffc800";
    for (let i = 0; i < 3; i++) {
      const a = t / 90 + i * 2.1;
      c.beginPath(); c.arc(cx + Math.cos(a) * 30, hipY - 134 + Math.sin(a) * 8, 4.5, 0, Math.PI * 2); c.fill();
    }
  }
}

export function DanceArrows({ game, me, players, sendAction }: MinigameProps) {
  const pub = game.publicData as { seed: number } & DanceConfig;
  const preset = useMemo(() => dancePreset(pub), [pub.lives, pub.speed, pub.window]);
  const chart = useMemo(() => buildChart(pub.seed, preset), [pub.seed, preset]);
  const judge = useMemo(() => new DanceJudge(chart, preset), [chart, preset]);
  const avatarId = players.find((p) => p.id === me)?.avatar ?? "fox";
  const avatar = AVATAR_VIEW[avatarId];
  const headImg = useMemo(() => avatarImage(avatarId), [avatarId]);
  const mine = game.players[me];

  const [deadAt, setDeadAt] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioRef = useRef<DanceAudio | null>(null);
  const sendRef = useRef(sendAction);
  sendRef.current = sendAction;

  useEffect(() => { audioRef.current?.setMuted(muted); }, [muted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const c = canvas?.getContext("2d");
    if (!canvas || !c) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    const audio = new DanceAudio();
    audioRef.current = audio;
    audio.resume();

    // Batidas (uma por "k") para a música acompanhar o ritmo, que vai acelerando
    const beats: { h: number; k: number; dt: number }[] = [];
    chart.forEach((a, i) => {
      if (i === 0 || a.k !== chart[i - 1].k) beats.push({ h: a.h, k: a.k, dt: 200 });
    });
    for (let i = 0; i < beats.length - 1; i++) beats[i].dt = beats[i + 1].h - beats[i].h;

    const st = {
      hit: new Set<number>(), missed: new Set<number>(),
      pressedUntil: [0, 0, 0, 0], flashes: [] as { lane: number; t0: number; kind: "hit" | "miss" }[],
      pose: -1, poseUntil: 0, stumbleUntil: 0, combo: 0,
      limbs: targetFor(-1, false, 0),
    };
    const gt = () => serverNow() - game.startsAt;

    const handle = (evs: DanceEvent[], t: number) => {
      for (const ev of evs) {
        if (ev.type === "hit") {
          st.hit.add(ev.idx!);
          st.combo++;
          st.pose = ev.lane; st.poseUntil = t + 320;
          st.flashes.push({ lane: ev.lane, t0: t, kind: "hit" });
          audio.blip(audio.now(), LANE_FREQ[ev.lane]);
        } else {
          if (ev.idx !== undefined) st.missed.add(ev.idx);
          st.combo = 0;
          st.stumbleUntil = t + 520;
          st.flashes.push({ lane: ev.lane, t0: t, kind: "miss" });
          audio.buzz(audio.now());
        }
        if (ev.dead) setDeadAt(ev.at);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      const lane = KEYS[e.key];
      if (lane === undefined) return;
      e.preventDefault();
      if (e.repeat) return;
      audio.resume();
      const t = gt();
      if (t < 0) return;
      st.pressedUntil[lane] = t + 130;
      if (judge.dead) return;
      handle(judge.press(lane, t), t);
      void sendRef.current({ lane, t });
    };
    window.addEventListener("keydown", onKey);

    // Agenda a música um pouco à frente do tempo atual
    let beatPtr = 0;
    const scheduler = setInterval(() => {
      if (judge.dead) return;
      const t = gt();
      const base = audio.now() - t / 1000;
      while (beatPtr < beats.length && beats[beatPtr].h < t - 60) beatPtr++;
      while (beatPtr < beats.length && beats[beatPtr].h < t + 1500) {
        const b = beats[beatPtr++];
        const when = base + b.h / 1000;
        if (when <= audio.now()) continue;
        if (b.dt >= 300 || b.k % 2 === 0) audio.kick(when);
        audio.bass(when, SCALE[(b.k * 3 + (b.k >> 2)) % SCALE.length] * (b.k % 16 >= 8 ? 2 : 1), Math.min(0.25, (b.dt / 1000) * 0.8));
        if (b.dt >= 260) audio.hat(when + b.dt / 2000);
      }
    }, 200);

    let raf = 0;
    const frame = () => {
      const t = gt();
      if (!judge.dead) handle(judge.advance(t), t);

      // fundo
      c.clearRect(0, 0, W, H);
      roundRect(c, 0, 0, W, H, 22);
      c.fillStyle = "#1f2c33"; c.fill();
      for (let l = 0; l < 4; l++) {
        roundRect(c, laneX(l) - LANE_GAP / 2 + 5, 8, LANE_GAP - 10, REC_Y + 44, 14);
        c.fillStyle = "rgba(255,255,255,.035)"; c.fill();
      }

      // alvos
      for (let l = 0; l < 4; l++) {
        const pressed = t < st.pressedUntil[l];
        const s = pressed ? 33 : 30;
        arrowPath(c, laneX(l), REC_Y, s, ROT[l]);
        c.fillStyle = pressed ? COLORS[l] + "66" : "rgba(255,255,255,.05)";
        c.strokeStyle = COLORS[l] + (pressed ? "ff" : "88");
        c.lineWidth = 5; c.lineJoin = "round";
        c.fill(); c.stroke();
      }

      // setas caindo
      for (const a of chart) {
        if (a.h - a.fall > t + 50) break;
        if (a.h + 500 < t || st.hit.has(a.idx)) continue;
        const p = 1 - (a.h - t) / a.fall;
        const y = TOP_Y + p * (REC_Y - TOP_Y);
        const alpha = st.missed.has(a.idx) ? Math.max(0, 1 - (t - a.h) / 450) * 0.45 : 1;
        drawArrow(c, a.lane, laneX(a.lane), y, 30, alpha);
      }

      // efeitos
      st.flashes = st.flashes.filter((f) => t - f.t0 < 350);
      for (const f of st.flashes) {
        const k = (t - f.t0) / 350;
        c.globalAlpha = 1 - k;
        c.strokeStyle = f.kind === "hit" ? COLORS[f.lane] : "#ff4b4b";
        c.lineWidth = 6;
        c.beginPath(); c.arc(laneX(f.lane), REC_Y, 30 + k * 40, 0, Math.PI * 2); c.stroke();
        c.globalAlpha = 1;
      }

      // personagem
      const stumble = t < st.stumbleUntil;
      const pose = t < st.poseUntil ? st.pose : -1;
      const tgt = targetFor(pose, stumble, t);
      const L = st.limbs;
      const k = 0.3;
      const lerp = (a: number, b: number) => a + (b - a) * k;
      L.lh = [lerp(L.lh[0], tgt.lh[0]), lerp(L.lh[1], tgt.lh[1])];
      L.rh = [lerp(L.rh[0], tgt.rh[0]), lerp(L.rh[1], tgt.rh[1])];
      L.lf = [lerp(L.lf[0], tgt.lf[0]), lerp(L.lf[1], tgt.lf[1])];
      L.rf = [lerp(L.rf[0], tgt.rf[0]), lerp(L.rf[1], tgt.rf[1])];
      L.dy = lerp(L.dy, tgt.dy); L.tilt = lerp(L.tilt, tgt.tilt);
      drawDancer(c, L, avatar.emoji, avatar.bg, stumble, t, headImg);

      // HUD: vidas, tempo e combo
      for (let i = 0; i < preset.lives; i++) heart(c, 28 + i * 27, 30, 10, i < judge.lives);
      c.textAlign = "right"; c.textBaseline = "alphabetic";
      c.fillStyle = "#8fa3ad"; c.font = "800 20px system-ui, sans-serif";
      c.fillText(`${(Math.max(0, judge.dead ? judge.deadAt! : t) / 1000).toFixed(1)} s`, W - 20, 36);
      if (st.combo >= 5) {
        c.textAlign = "center"; c.fillStyle = "#ffc800"; c.font = "900 26px system-ui, sans-serif";
        c.fillText(`x${st.combo}`, W / 2, 470);
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      clearInterval(scheduler);
      window.removeEventListener("keydown", onKey);
      audio.close();
      audioRef.current = null;
    };
  }, [chart, judge, game.startsAt, preset.lives, avatar.emoji, avatar.bg, headImg]);

  const fell = deadAt !== null || mine?.status === "eliminated";
  const survived = mine?.timeMs ?? deadAt ?? 0;

  return (
    <div className="dance">
      <div className="dance-wrap">
        <canvas ref={canvasRef} className="dance-canvas" />
        {fell && (
          <div className="chess-overlay">
            <strong className="big">Você caiu!</strong>
            <small>Sobreviveu {formatTime(survived)}</small>
            <small>Aguardando os outros…</small>
          </div>
        )}
      </div>
      <div className="dance-foot">
        <span>Use ← ↓ ↑ → (ou A S W D)</span>
        <button className="btn ghost mini" onClick={() => setMuted((m) => !m)}>Som {muted ? "desligado" : "ligado"}</button>
      </div>
    </div>
  );
}
