import React from 'react';
import { BouncingGuy } from './BouncingGuy';
import { Pulse } from './Pulse';

export const RandomLoader = () => {
  const spinners = ['bounce', 'pulse'];
  const index = Math.round(Math.random() * (spinners.length - 1));

  switch (spinners[index]) {
    case 'bounce':
      return <BouncingGuy />;
    case 'pulse':
    default:
      return <Pulse />;
  }
};
