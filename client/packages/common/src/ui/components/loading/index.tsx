import React from 'react';
import { BouncingGuy } from './BouncingGuy';
import { Pulse } from './Pulse';

export * from './BasicSpinner';
export * from './InlineSpinner';
export * from './Biker';
export { BouncingGuy, Pulse };

export const getRandomSpinner = () => {
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
