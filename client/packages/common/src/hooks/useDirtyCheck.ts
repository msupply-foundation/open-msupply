import create from 'zustand';

type DirtyState = {
  isDirty: boolean;
  setIsDirty: (open: boolean) => void;
};

export const useDirtyCheck = create<DirtyState>(set => ({
  isDirty: false,
  setIsDirty: isDirty => set(state => ({ ...state, isDirty })),
}));
