import { useEffect, useMemo, useRef, useState } from "react";
import type { ActionAck, PlayerPublic, PlayerRoundInfo, PlayerRoundStatus, RoomState, StandingEntry } from "@party/shared";
import { socket } from "../socket";
import { useNow } from "../hooks";
import { Avatar } from "../components/Avatar";
import { CheckIcon, CrownIcon, DotsIcon, HeartIcon, WifiOffIcon } from "../components/Icons";
import type { Notify } from "../components/Toasts";
import { formatTime } from "../format";
import { CLIENT_MINIGAMES } from "../minigames";

function RoundChip({ info, connected }: { info?: PlayerRoundInfo; connected: boolean }) {
  if (!connected) return <span className="chip off"><WifiOffIcon size={14} /> Desconectado</span>;
  if (info?.status === "finished") return <span className="chip ready"><CheckIcon size={14} /> {formatTime(info.timeMs ?? 0)}</span>;
  if (info?.status === "eliminated") return <span className="chip off">Caiu · {formatTime(info.timeMs ?? 0)}</span>;
  if (info?.status === "timeout") return <span className="chip off">Sem resultado</span>;
  if (info?.lives !== undefined)
    return (
      <span className="chip life">
        <span className="hearts">{Array.from({ length: Math.min(info.lives, 7) }, (_, i) => <HeartIcon key={i} size={13} />)}</span>
      </span>
    );
  return <span className="chip wait"><DotsIcon size={14} /> Jogando</span>;
}

function Podium({ standings, players, me }: { standings: StandingEntry[]; players: PlayerPublic[]; me: string }) {
  const top = standings.slice(0, 3);
  const order = [1, 0, 2].filter((i) => i < top.length); // 2º, 1º, 3º
  const heights = [130, 100, 76];
  return (
    <div className="podium">
      {order.map((i) => {
        const s = top[i];
        const p = players.find((x) => x.id === s.playerId);
        return (
          <div key={s.playerId} className="pod" style={{ animationDelay: `${(2 - i) * 0.15}s` }}>
            {p ? <Avatar id={p.avatar} size={i === 0 ? 76 : 60} /> : <span style={{ height: 60 }} />}
            <span className="pod-name">{p?.name ?? "Saiu"}{s.playerId === me ? " (você)" : ""}</span>
            <span className="pod-score">{s.score} pts</span>
            <div className={`pod-bar r${s.rank}`} style={{ height: heights[i] }}>{s.rank}</div>
          </div>
        );
      })}
    </div>
  );
}

function Confetti() {
  const bits = useMemo(
    () => Array.from({ length: 56 }, (_, i) => ({
      left: Math.random() * 100, delay: Math.random() * 1.6, dur: 2.6 + Math.random() * 2.4,
      color: ["#58cc02", "#1cb0f6", "#ffc800", "#ff6b6b", "#d8c9ff"][i % 5], size: 7 + Math.random() * 7,
    })),
    [],
  );
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i key={i} style={{ left: `${b.left}%`, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, background: b.color, width: b.size, height: b.size * 0.6 }} />
      ))}
    </div>
  );
}

export function Game({ room, me, notify }: { room: RoomState; me: string; notify: Notify }) {
  const game = room.game;
  const match = room.match;
  const phase = room.phase;
  const now = useNow();
  const isHost = room.hostId === me;

  // Avisos e destaque no painel quando alguém termina ou cai
  const prevStatus = useRef<{ key: number; map: Record<string, PlayerRoundStatus> }>({ key: 0, map: {} });
  const [pulse, setPulse] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const g = room.game;
    if (!g) return;
    if (prevStatus.current.key !== g.startsAt) {
      prevStatus.current = { key: g.startsAt, map: Object.fromEntries(Object.entries(g.players).map(([k, v]) => [k, v.status])) };
      return;
    }
    const changed: string[] = [];
    for (const [id, info] of Object.entries(g.players)) {
      const before = prevStatus.current.map[id];
      if (before === "playing" && (info.status === "finished" || info.status === "eliminated")) {
        changed.push(id);
        if (id !== me) {
          const name = room.players.find((p) => p.id === id)?.name ?? "Jogador";
          notify(
            info.status === "eliminated" ? `${name} caiu!` : `${name} terminou em ${formatTime(info.timeMs ?? 0)}`,
            info.status === "eliminated" ? "bad" : "good",
          );
        }
      }
      prevStatus.current.map[id] = info.status;
    }
    if (changed.length) {
      setPulse((p) => ({ ...p, ...Object.fromEntries(changed.map((id) => [id, true])) }));
      setTimeout(() => setPulse((p) => { const n = { ...p }; changed.forEach((id) => delete n[id]); return n; }), 1000);
    }
  }, [room.game]);

  const inRound = phase === "countdown" || phase === "playing";
  const showsGame = inRound || phase === "roundResult";
  const sendAction = (action: unknown) =>
    new Promise<ActionAck>((resolve) => socket.emit("game:action", action, resolve));
  const secsTo = (t?: number) => Math.max(0, Math.ceil(((t ?? now) - now) / 1000));
  const who = (id: string) => room.players.find((p) => p.id === id);

  if (showsGame && !game) return null;
  const Comp = game ? CLIENT_MINIGAMES[game.minigameId] : undefined;
  const info = game ? room.catalog.find((m) => m.id === game.minigameId) : undefined;
  const countdownSecs = game ? Math.max(1, Math.ceil((game.startsAt - now) / 1000)) : 0;
  const progress = game ? Math.min(1, Math.max(0, (game.endsAt - now) / (game.endsAt - game.startsAt))) : 0;
  const standings = match?.standings ?? [];
  const winners = standings.filter((s) => s.rank === 1).map((s) => who(s.playerId)?.name ?? "Jogador");
  const connectedPlayers = room.players.filter((p) => p.connected);
  const returnedCount = connectedPlayers.filter((p) => p.inLobby).length;

  // Painel dos jogadores, ordenado: quem terminou/sobrevive mais aparece primeiro
  const survival = game?.type === "survival";
  const rows = game ? room.players.filter((p) => game.players[p.id]).map((p) => ({ p, info: game.players[p.id] })) : [];
  const group = (i: PlayerRoundInfo) =>
    survival ? (i.status === "eliminated" ? 1 : 0) : i.status === "finished" ? 0 : i.status === "playing" ? 1 : 2;
  rows.sort((a, b) => {
    const ga = group(a.info), gb = group(b.info);
    if (ga !== gb) return ga - gb;
    if (survival) return ga === 1 ? (b.info.timeMs ?? 0) - (a.info.timeMs ?? 0) : (b.info.lives ?? 0) - (a.info.lives ?? 0);
    return ga === 0 ? (a.info.timeMs ?? 0) - (b.info.timeMs ?? 0) : 0;
  });
  const doneCount = rows.filter((r) => (survival ? r.info.status === "eliminated" : r.info.status === "finished")).length;
  const counter = survival ? `${rows.length - doneCount} vivos` : `${doneCount}/${rows.length} terminaram`;

  return (
    <main className="screen">
      {phase === "final" && <Confetti />}
      <div className="game">
        <div className="game-head">
          {match && <span className="round-pill">{phase === "final" ? "Fim de jogo" : `Rodada ${match.round}/${match.totalRounds}`}</span>}
          {showsGame && game && <h2>{game.name}</h2>}
          {phase === "playing" && game
            ? <div className="timebar"><div style={{ width: `${progress * 100}%` }} /></div>
            : <span className="spacer" />}
          {isHost && phase !== "final" && (
            <button className="btn ghost small-text" onClick={() => socket.emit("room:backToLobby")}>Encerrar</button>
          )}
        </div>

        {phase === "roundResult" && game && (
          <div className="card stack wide centered">
            <h2 className="title">Resultado da rodada</h2>
            <ul className="results">
              {game.results?.map((r) => {
                const p = who(r.playerId);
                const finished = r.timeMs !== undefined;
                return (
                  <li key={r.playerId} className="result">
                    <span className={`rank ${finished ? `r${r.rank}` : ""}`}>{finished ? r.rank : "–"}</span>
                    {p ? <Avatar id={p.avatar} size={44} /> : <span />}
                    <strong className="grow">{p?.name ?? "Jogador saiu"}{r.playerId === me ? " (você)" : ""}</strong>
                    <span className="time">{finished ? (game.type === "survival" ? "sobreviveu " : "") + formatTime(r.timeMs!) : "—"}</span>
                    <span className={`chip ${r.points > 0 ? "plus" : "wait"}`}>+{r.points}</span>
                  </li>
                );
              })}
            </ul>
            <p className="subtitle">Classificação em {secsTo(game.resultEndsAt)}s…</p>
          </div>
        )}

        {(phase === "standings" || phase === "final") && (
          <div className="card stack wide centered">
            <h2 className="title">{phase === "final" ? "Resultado final" : "Classificação"}</h2>
            {phase === "final" && winners.length > 0 && (
              <div className="winner">
                <CrownIcon size={24} /> {winners.length === 1 ? `${winners[0]} venceu!` : `Empate: ${winners.join(" e ")}!`}
              </div>
            )}
            <Podium standings={standings} players={room.players} me={me} />
            <ul className="results">
              {standings.map((s) => {
                const p = who(s.playerId);
                return (
                  <li key={s.playerId} className="result">
                    <span className={`rank r${s.rank}`}>{s.rank}</span>
                    {p ? <Avatar id={p.avatar} size={44} /> : <span />}
                    <strong className="grow">{p?.name ?? "Jogador saiu"}{s.playerId === me ? " (você)" : ""}</strong>
                    {s.gained > 0 && <span className="chip plus">+{s.gained}</span>}
                    <span className="time">{s.score} pts</span>
                  </li>
                );
              })}
            </ul>
            {phase === "final" ? (
              <>
                <button className="btn blue" onClick={() => socket.emit("room:returnToLobby")}>Voltar ao lobby</button>
                <p className="subtitle">
                  {returnedCount}/{connectedPlayers.length} já voltaram · todos voltam em {secsTo(match?.phaseEndsAt)}s
                </p>
              </>
            ) : (
              <p className="subtitle">Próxima rodada em {secsTo(match?.phaseEndsAt)}s…</p>
            )}
          </div>
        )}

        {inRound && game && (
          <div className="game-layout">
            <div className="stage">
              {Comp ? (
                <Comp key={game.startsAt} game={game} me={me} players={room.players} sendAction={sendAction} />
              ) : (
                <p className="error">Minigame não encontrado: {game.minigameId}</p>
              )}
              {phase === "countdown" && (
                <div className="overlay">
                  <div className="intro">
                    {match && <span className="round-pill">Rodada {match.round}/{match.totalRounds}</span>}
                    <h2>{game.name}</h2>
                    {info && <p>{info.description}</p>}
                  </div>
                  <div className="count" key={countdownSecs}>{countdownSecs}</div>
                </div>
              )}
            </div>
            <aside className="side">
              <div className="side-head">
                <h3 className="section">Jogadores</h3>
                <em>{counter}</em>
              </div>
              <ul className="side-list">
                {rows.map(({ p, info: pi }, idx) => (
                  <li key={p.id} className={`side-item ${pi.status} ${p.id === me ? "me" : ""} ${pulse[p.id] ? "pulse" : ""}`}>
                    {!survival && pi.status === "finished" && <span className={`rank sm r${idx + 1}`}>{idx + 1}</span>}
                    <Avatar id={p.avatar} size={38} />
                    <div className="player-info">
                      <strong>{p.name}{p.id === me ? " (você)" : ""}</strong>
                      <RoundChip info={pi} connected={p.connected} />
                    </div>
                    <span className="pts">{match?.scores[p.id] ?? 0} pts</span>
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
