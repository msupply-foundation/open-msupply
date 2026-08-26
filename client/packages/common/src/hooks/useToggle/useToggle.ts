import { SetStateAction, useState, Dispatch, useCallback } from 'react';

export interface ToggleState {
  isOn: boolean;
  toggle: () => void;
  toggleOn: () => void;
  toggleOff: () => void;
  setToggled: Dispatch<SetStateAction<boolean>>;
}

export const useToggle = (initial = false): ToggleState => {
  const [isOn, setToggled] = useState(initial);

  const toggleOn = useCallback(() => setToggled(true), []);
  const toggleOff = useCallback(() => setToggled(false), []);
  const toggle = useCallback(() => setToggled(state => !state), []);

  return { isOn, toggle, toggleOn, toggleOff, setToggled };
};
