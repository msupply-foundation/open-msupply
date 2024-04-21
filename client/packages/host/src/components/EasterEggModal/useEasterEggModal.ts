import { useContext, useCallback } from 'react';
import { EasterEggModalContext } from './EasterEggModalContext';

export const useEasterEggModal = () => {
  const { setOpen } = useContext(EasterEggModalContext);

  const trigger = () => {
    setOpen(true);
  };

  return useCallback(trigger, [setOpen]);
};
