import { useRef } from 'react';

export const useDirtyCheck = () => {
  const isDirty = useRef(false);
  const markDirty = (dirty: boolean) => {
    isDirty.current = dirty;
  };

  return { isDirty: isDirty.current, markDirty };
};
