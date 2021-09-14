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

export const useWindowDimensions = (): WindowDimensions => {
  const [dimensions, setDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    const resize = () => setDimensions(getWindowDimensions());
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  return dimensions;
};
