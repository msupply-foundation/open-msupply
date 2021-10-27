import { SetStateAction, useState, Dispatch } from 'react';

interface ToggleState {
  isOn: boolean;
  toggle: () => void;
  toggleOn: () => void;
  toggleOff: () => void;
  setToggled: Dispatch<SetStateAction<boolean>>;
}

export const useToggle = (initial = false): ToggleState => {
  const [isOn, setToggled] = useState(initial);

  const toggleOn = () => setToggled(true);
  const toggleOff = () => setToggled(false);
  const toggle = () => setToggled(state => !state);

  return { isOn, toggle, toggleOn, toggleOff, setToggled };
};
