import { useState } from 'react';

type DirtyState = {
  isDirty: boolean;
  setIsDirty: (on: boolean) => void;
};

export const useDirtyCheck = (): DirtyState => {
  const [isDirty, setIsDirty] = useState(false);
  return { isDirty, setIsDirty };
};
