import { useRef } from 'react';

type DirtyState = {
  isDirty: boolean;
  setIsDirty: (open: boolean) => void;
};

export const useDirtyCheck = (): DirtyState => {
  const ref = useRef<boolean>(false);
  return {
    isDirty: ref.current,
    setIsDirty: isDirty => {
      ref.current = isDirty;
    },
  };
};
