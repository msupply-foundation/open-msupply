import { useEffect } from 'react';
import { useRnRFormContext, useUpdateLines } from '../api';
import { useConfirmOnLeaving, useNotification } from '@common/hooks';

const AUTO_SAVE_EVERY = 10 * 1000; // 10 seconds

export const useSaveAllLines = () => {
  const { getAllDirtyLines, clearAllDirtyLines, rnrFormId } = useRnRFormContext(
    ({ getAllDirtyLines, clearAllDirtyLines, rnrFormId }) => ({
      rnrFormId,
      getAllDirtyLines,
      clearAllDirtyLines,
    })
  );

  const { mutateAsync: updateLines } = useUpdateLines(rnrFormId);
  const { error } = useNotification();

  return async () => {
    const linesToSave = getAllDirtyLines();

    if (linesToSave.length === 0) return;

    try {
      await updateLines(linesToSave);
      clearAllDirtyLines();
    } catch (e) {
      error((e as Error).message)();
    }
  };
};

// Would auto save every AUTO_SAVE_EVERY and will save on page refresh
export const AutoSave = () => {
  const saveLines = useSaveAllLines();

  const saveLinesOnNavigate = () => {
    // Technically should block for this, not even sure if it will work
    saveLines();
    return false;
  };

  useConfirmOnLeaving('rnr-form', {
    customCheck: {
      navigate: saveLinesOnNavigate,
      refresh: saveLinesOnNavigate,
    },
  });

  useEffect(() => {
    const interval = setInterval(saveLines, AUTO_SAVE_EVERY);

    return () => clearInterval(interval);
  }, []);

  return null;
};
