import { Direction } from '@mui/material/styles';
import { Theme } from '@mui/material';
import { useState, useEffect } from 'react';
import { themeOptions, createTheme } from './theme';
import { useRtl } from '@common/intl';
import { useLocalStorage } from '../localStorage';
import merge from 'lodash/merge';

export const useAppTheme = (): Theme => {
  const [customTheme] = useLocalStorage('/theme/custom');
  const appTheme = customTheme
    ? createTheme(merge(themeOptions, customTheme))
    : createTheme(themeOptions);
  const [currentTheme, setTheme] = useState(appTheme);
  const isRtl = useRtl();

  const setDirection = (newDirection: Direction) => {
    const newTheme = { ...currentTheme, direction: newDirection };
    setTheme(newTheme);
  };

  useEffect(() => {
    const newDirection = isRtl ? 'rtl' : 'ltr';
    setDirection(newDirection);
  }, [isRtl]);

  return currentTheme;
};
