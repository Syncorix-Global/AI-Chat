import { useEffect, useRef, useState } from "react";

export function useSessionTimer(ms: number) {
  const [elapsed, setElapsed] = useState(0);
  const id = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    id.current = window.setInterval(() => {
      setElapsed(Math.floor(performance.now() - start));
    }, Math.max(50, Math.min(ms / 10, 500)));
    return () => { if (id.current) clearInterval(id.current); };
  }, [ms]);

  return { elapsed, done: elapsed >= ms, reset: () => setElapsed(0) };
}
