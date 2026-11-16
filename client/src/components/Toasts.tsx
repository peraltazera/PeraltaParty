import { useCallback, useRef, useState } from "react";

export type ToastTone = "good" | "bad" | "info";
export interface Toast { id: number; text: string; tone: ToastTone }
export type Notify = (text: string, tone?: ToastTone) => void;

// Avisos rápidos no canto da tela (entrou, saiu, terminou, caiu...)
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const next = useRef(0);
  const push = useCallback<Notify>((text, tone = "info") => {
    const id = ++next.current;
    setToasts((t) => [...t.slice(-4), { id, text, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);
  return { toasts, push };
}

export function Toasts({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="toasts">
      {toasts.map((t) => <div key={t.id} className={`toast ${t.tone}`}>{t.text}</div>)}
    </div>
  );
}
