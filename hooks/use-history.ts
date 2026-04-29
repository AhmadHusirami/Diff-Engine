import { useState, useCallback } from 'react';

export function useHistory<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const [history, setHistory] = useState<T[]>([initialState]);
  const [pointer, setPointer] = useState<number>(0);

  const set = useCallback((value: T | ((val: T) => T)) => {
    setState((current) => {
      const nextState = typeof value === 'function' ? (value as Function)(current) : value;
      if (nextState === current) return current;
      
      const newHistory = history.slice(0, pointer + 1);
      newHistory.push(nextState);
      setHistory(newHistory);
      setPointer(newHistory.length - 1);
      return nextState;
    });
  }, [history, pointer]);

  const undo = useCallback(() => {
    if (pointer > 0) {
      setPointer((p) => p - 1);
      setState(history[pointer - 1]);
    }
  }, [history, pointer]);

  const redo = useCallback(() => {
    if (pointer < history.length - 1) {
      setPointer((p) => p + 1);
      setState(history[pointer + 1]);
    }
  }, [history, pointer]);

  const reset = useCallback((value: T) => {
    setState(value);
    setHistory([value]);
    setPointer(0);
  }, []);

  return [state, set, { undo, redo, canUndo: pointer > 0, canRedo: pointer < history.length - 1, reset }] as const;
}
