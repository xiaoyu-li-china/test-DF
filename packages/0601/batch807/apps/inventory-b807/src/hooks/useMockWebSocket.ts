import { useEffect, useRef, useCallback } from 'react';
import { useInventoryStore } from '../store/useInventoryStore';
import { generateInitialData, generateRandomUpdate } from '../utils/mockData';

export function useMockWebSocket() {
  const { setItems, updateItems, setConnected, addHistory } = useInventoryStore();
  const intervalRef = useRef<number | null>(null);
  const disconnectTimerRef = useRef<number | null>(null);
  const itemsRef = useRef(generateInitialData());

  const connect = useCallback(() => {
    setConnected(true);
    setItems(itemsRef.current);
    addHistory(new Date().toISOString(), itemsRef.current);

    intervalRef.current = window.setInterval(() => {
      itemsRef.current = generateRandomUpdate(itemsRef.current);
      updateItems(itemsRef.current);
      addHistory(new Date().toISOString(), itemsRef.current);
    }, 8000);

    disconnectTimerRef.current = window.setTimeout(() => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setConnected(false);

      setTimeout(() => {
        connect();
      }, 5000);
    }, 45000);
  }, [setConnected, setItems, updateItems, addHistory]);

  useEffect(() => {
    const timer = setTimeout(connect, 500);

    return () => {
      clearTimeout(timer);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (disconnectTimerRef.current) {
        clearTimeout(disconnectTimerRef.current);
      }
    };
  }, [connect]);

  return null;
}
