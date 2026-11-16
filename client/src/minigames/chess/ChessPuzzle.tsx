import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Chess, type Square } from "chess.js";
import { useNow } from "../../hooks";
import { formatTime } from "../../format";
import type { MinigameProps } from "../types";

// O cliente só desenha o tabuleiro e envia o lance; quem decide se foi mate é o servidor.
const GLYPH: Record<string, string> = {
  k: "\u265A", q: "\u265B", r: "\u265C", b: "\u265D", n: "\u265E", p: "\u265F\uFE0E",
};
const FILES = "abcdefgh";
const DRAG_THRESHOLD = 5; // px para considerar que é arrasto, e não um clique

interface Pub { fen: string; limitMs: number; penaltyMs: number }
type Reply = { correct?: boolean; penaltyMs?: number } | undefined;
interface DragInfo { from: Square; sx: number; sy: number; moved: boolean; wasSelected: boolean }

export function ChessPuzzle({ game, me, players, sendAction }: MinigameProps) {
  const pub = game.publicData as Pub;
  const penaltyS = (pub.penaltyMs ?? 2000) / 1000;
  const chess = useMemo(() => new Chess(pub.fen), [pub.fen]);
  const turn = chess.turn(); // os puzzles são sempre com as brancas jogando

  const [selected, setSelected] = useState<Square | null>(null);
  const [promo, setPromo] = useState<{ from: Square; to: Square } | null>(null);
  const [penaltyMs, setPenaltyMs] = useState(0);
  const [wrongSq, setWrongSq] = useState<Square | null>(null);
  const [msg, setMsg] = useState("");
  const [drag, setDrag] = useState<{ from: Square; x: number; y: number } | null>(null);
  const [over, setOver] = useState<Square | null>(null);
  const busy = useRef(false);
  const boardRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragInfo | null>(null);
  const now = useNow(100);

  const mine = game.players[me];
  const done = mine?.status === "finished";
  const out = mine?.status === "timeout";
  const left = Math.max(0, pub.limitMs - Math.max(0, now - game.startsAt) - penaltyMs);
  const expired = !done && (out || left <= 0);
  const locked = done || expired || now < game.startsAt;
  const waiting = players.some((p) => p.id !== me && p.connected && game.players[p.id]?.status === "playing");

  const targets = useMemo(
    () => (selected ? chess.moves({ square: selected, verbose: true }) : []),
    [selected, chess],
  );

  const submit = async (from: Square, to: Square, promotion?: string) => {
    busy.current = true;
    setSelected(null);
    setPromo(null);
    const r = await sendAction({ from, to, promotion });
    busy.current = false;
    const d = r.data as Reply;
    if (d && d.correct === false) {
      setPenaltyMs(d.penaltyMs ?? penaltyMs + penaltyS * 1000);
      setWrongSq(to);
      setMsg(penaltyS > 0 ? `Não é mate! −${penaltyS}s` : "Não é mate!");
      setTimeout(() => { setWrongSq(null); setMsg(""); }, 1200);
    }
  };

  // Tenta jogar from -> to (só se for um lance legal; lances impossíveis são ignorados, sem penalidade)
  const tryMove = (from: Square, to: Square): boolean => {
    const m = chess.moves({ square: from, verbose: true }).find((x) => x.to === to);
    if (!m) return false;
    if (m.promotion) setPromo({ from, to });
    else void submit(from, to);
    return true;
  };

  // Descobre a casa sob o ponteiro (tabuleiro sempre com as brancas embaixo)
  const squareAt = (cx: number, cy: number): Square | null => {
    const el = boardRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const size = el.clientWidth;
    const f = Math.floor(((cx - (r.left + el.clientLeft)) / size) * 8);
    const k = Math.floor(((cy - (r.top + el.clientTop)) / size) * 8);
    if (f < 0 || f > 7 || k < 0 || k > 7) return null;
    return (FILES[f] + (8 - k)) as Square;
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (locked || promo || busy.current || e.button !== 0) return;
    const sq = squareAt(e.clientX, e.clientY);
    if (!sq) return;
    if (selected && targets.some((m) => m.to === sq)) { tryMove(selected, sq); return; } // clicar no destino
    const piece = chess.get(sq);
    if (piece && piece.color === turn) {
      dragRef.current = { from: sq, sx: e.clientX, sy: e.clientY, moved: false, wasSelected: selected === sq };
      setSelected(sq);
      try { boardRef.current?.setPointerCapture(e.pointerId); } catch { /* ignora */ }
    } else {
      setSelected(null);
    }
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > DRAG_THRESHOLD) d.moved = true;
    if (d.moved) {
      setDrag({ from: d.from, x: e.clientX, y: e.clientY });
      setOver(squareAt(e.clientX, e.clientY));
    }
  };

  const endDrag = (e: ReactPointerEvent<HTMLDivElement>, cancelled: boolean) => {
    const d = dragRef.current;
    if (!d) return;
    dragRef.current = null;
    setDrag(null);
    setOver(null);
    try { boardRef.current?.releasePointerCapture(e.pointerId); } catch { /* ignora */ }
    if (cancelled) return;
    if (d.moved) {
      const sq = squareAt(e.clientX, e.clientY);
      if (sq && sq !== d.from) tryMove(d.from, sq);
    } else if (d.wasSelected) {
      setSelected(null); // clicar de novo na peça selecionada desmarca
    }
  };

  const cells: { sq: Square; i: number; j: number }[] = [];
  for (let i = 0; i < 8; i++)
    for (let j = 0; j < 8; j++) cells.push({ sq: (FILES[j] + (8 - i)) as Square, i, j });

  const sqPx = (boardRef.current?.clientWidth ?? 480) / 8;
  const ghostPiece = drag ? chess.get(drag.from) : undefined;

  return (
    <div className="chess">
      <div className="chess-info">
        <span className={`turn-dot ${turn}`} />
        <strong>{turn === "w" ? "Brancas" : "Pretas"} jogam · mate em 1</strong>
        <span className={`chess-time ${left < 6000 ? "low" : ""}`}>{(left / 1000).toFixed(1)}s</span>
      </div>

      <div className="board-wrap">
        <div
          ref={boardRef}
          className={`board ${drag ? "dragging-now" : ""}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => endDrag(e, false)}
          onPointerCancel={(e) => endDrag(e, true)}
        >
          {cells.map(({ sq, i, j }) => {
            const piece = chess.get(sq);
            const dark = (j + (8 - i)) % 2 === 1;
            const isTarget = targets.some((m) => m.to === sq);
            const cls = [
              "sq", dark ? "dark" : "light",
              selected === sq ? "sel" : "",
              isTarget ? (piece ? "cap" : "dot") : "",
              piece && piece.color === turn && !locked ? "mine" : "",
              drag?.from === sq ? "dragging" : "",
              drag && over === sq ? (isTarget ? "over-ok" : "over-no") : "",
              wrongSq === sq ? "wrong" : "",
            ].join(" ");
            return (
              <div key={sq} className={cls}>
                {j === 0 && <span className="coord coord-rank">{8 - i}</span>}
                {i === 7 && <span className="coord coord-file">{FILES[j]}</span>}
                {piece && <span className={`piece ${piece.color}`}>{GLYPH[piece.type]}</span>}
              </div>
            );
          })}
        </div>

        {drag && ghostPiece && (
          <span
            className={`piece ghost ${ghostPiece.color}`}
            style={{ left: drag.x - sqPx / 2, top: drag.y - sqPx / 2, width: sqPx, height: sqPx, fontSize: sqPx * 0.78 }}
          >
            {GLYPH[ghostPiece.type]}
          </span>
        )}

        {promo && (
          <div className="chess-overlay">
            <p>Promover para:</p>
            <div className="promo-row">
              {(["q", "r", "b", "n"] as const).map((t) => (
                <button key={t} className="promo-btn" onClick={() => void submit(promo.from, promo.to, t)}>
                  <span className={`piece ${turn}`}>{GLYPH[t]}</span>
                </button>
              ))}
            </div>
            <button className="btn ghost mini" onClick={() => { setPromo(null); setSelected(null); }}>Cancelar</button>
          </div>
        )}

        {(done || expired) && (
          <div className="chess-overlay">
            {done ? (
              <>
                <strong className="big">Mate em {formatTime(mine.timeMs ?? 0)}</strong>
                <small>{waiting ? "Aguardando os outros…" : "Todos terminaram!"}</small>
              </>
            ) : (
              <>
                <strong className="big">Tempo esgotado</strong>
                <small>Aguardando o fim da rodada…</small>
              </>
            )}
          </div>
        )}
      </div>

      <p className="chess-msg">{msg || "\u00A0"}</p>
    </div>
  );
}
