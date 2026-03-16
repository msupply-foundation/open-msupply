import { useRef, useCallback } from 'react';

type SubmitCallback = () => void;

export interface SubmitRegistry {
  register: (id: string, callback: SubmitCallback) => void;
  unregister: (id: string) => void;
  submitAll: () => boolean;
}

export const useSubmitRegistry = (): SubmitRegistry => {
  const registry = useRef(new Map<string, SubmitCallback>());

  const register = useCallback((id: string, callback: SubmitCallback) => {
    registry.current.set(id, callback);
  }, []);

  const unregister = useCallback((id: string) => {
    registry.current.delete(id);
  }, []);

  const submitAll = useCallback(() => {
    let invoked = false;
    registry.current.forEach(callback => {
      callback();
      invoked = true;
    });
    return invoked;
  }, []);

  return { register, unregister, submitAll };
};
