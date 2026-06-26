import { useEffect, useRef } from 'react';

type CleanupFn = () => void;

export function useCleanup() {
  const cleanupsRef = useRef<CleanupFn[]>([]);

  const addTimer = (id: ReturnType<typeof setTimeout> | ReturnType<typeof setInterval>) => {
    cleanupsRef.current.push(() => {
      clearTimeout(id as ReturnType<typeof setTimeout>);
      clearInterval(id as ReturnType<typeof setInterval>);
    });
  };

  const addWebSocket = (ws: WebSocket) => {
    cleanupsRef.current.push(() => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    });
  };

  const addCustomCleanup = (fn: CleanupFn) => {
    cleanupsRef.current.push(fn);
  };

  useEffect(() => {
    return () => {
      cleanupsRef.current.forEach((fn) => fn());
      cleanupsRef.current = [];
    };
  }, []);

  return { addTimer, addWebSocket, addCustomCleanup };
}
