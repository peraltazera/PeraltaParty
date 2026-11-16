import { useEffect, useState } from "react";
import { serverNow } from "./socket";

// Horário do servidor, atualizado a cada `ms` (para contagens regressivas).
export function useNow(ms = 100) {
  const [n, setN] = useState(serverNow());
  useEffect(() => {
    const i = setInterval(() => setN(serverNow()), ms);
    return () => clearInterval(i);
  }, [ms]);
  return n;
}
