import React, { FC } from 'react';
import { GlobalStyles } from '@mui/material';
import Box from '@mui/material/Box';
import { styled } from '@mui/material/styles';
import { MSupplyGuy } from '../../../icons';

const Container = styled(Box)({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexDirection: 'column',
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
});

const styles = {
  '.enter': {
    opacity: 0,
    animationName: 'fade-in',
    animationIterationCount: 1,
    animationDuration: '0.4s',
    animationDelay: '0.1s',
    animationFillMode: 'forwards',
  },
  '.bounce': {
    animationName: 'bounce',
    animationDuration: '0.9s',
    animationIterationCount: 'infinite',
  },
  '.logo': {
    animationName: 'squash',
    animationDuration: '0.9s',
    animationIterationCount: 'infinite',
  },
  '@keyframes fade-in': {
    '0%': {
      opacity: 0,
      animationTimingFunction: 'cubic-bezier(0, 0, 0.5, 1)',
    },
    '100%': {
      opacity: 1,
    },
  },

  '@keyframes bounce': {
    from: {},
    to: {
      transform: 'translateY(0px)',
      animationTimingFunction: 'cubic-bezier(0.3, 0, 0.1, 1)',
    },
    '50%': {
      transform: 'translateY(-50px)',
      animationTimingFunction: 'cubic-bezier(0.9, 0, 0.7, 1)',
    },
  },

  '@keyframes squash': {
    '0%': {
      transform: 'scaleX(1.3) scaleY(0.8)',
      animationTimingFunction: 'cubic-bezier(0.3, 0, 0.1, 1)',
      transformOrigin: 'bottom center',
    },
    '15%': {
      transform: 'scaleX(0.75) scaleY(1.25)',
      animationTimingFunction: 'cubic-bezier(0, 0, 0.7, 0.75)',
      transformOrigin: 'bottom center',
    },
    '55%': {
      transform: 'scaleX(1.05) scaleY(0.95)',
      animationTimingFunction: 'cubic-bezier(0.9, 0, 1, 1)',
      transformOrigin: 'top center',
    },
    '95%': {
      transform: 'scaleX(0.75) scaleY(1.25)',
      animationTimingFunction: 'cubic-bezier(0, 0, 0, 1)',
      transformOrigin: 'bottom center',
    },
    '100%': {
      transform: 'scaleX(1.3) scaleY(0.8)',
      transformOrigin: 'bottom center',
      animationTimingFunction: 'cubic-bezier(0, 0, 0.7, 1)',
    },
  },
};

export const BouncingGuy: FC = () => (
  <Container>
    <GlobalStyles styles={styles} />
    <div className="enter">
      <div className="bounce">
        <div className="logo">
          <MSupplyGuy size="large" />
        </div>
      </div>
    </div>
  </Container>
);
