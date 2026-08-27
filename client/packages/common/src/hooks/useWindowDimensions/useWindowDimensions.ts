import { useDebounceCallback } from './../useDebounce';
import { useState, useEffect } from 'react';

interface WindowDimensions {
  width: number;
  height: number;
}

function getWindowDimensions(): WindowDimensions {
  const { innerWidth: width, innerHeight: height } = window;

  return {
    width,
    height,
  };
}

export const useWindowDimensions = (debouncedTimer = 500): WindowDimensions => {
  const [dimensions, setDimensions] = useState(getWindowDimensions());

  const resize = useDebounceCallback(
    () => {
      setDimensions(getWindowDimensions());
    },
    [],
    debouncedTimer
  );

  useEffect(() => {
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return dimensions;
};
