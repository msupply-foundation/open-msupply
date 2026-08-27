import React, { FC } from 'react';
import { GlobalStyles, Typography, Box } from '@mui/material';

const styles = {
  '.biker': {
    width: '106px',
    height: '56px',
    display: 'block',
    margin: '30px auto',
    backgroundImage:
      'linear-gradient(#000 50px, transparent 0), linear-gradient(#000 50px, transparent 0), linear-gradient(#000 50px, transparent 0), linear-gradient(#000 50px, transparent 0), radial-gradient(circle 14px, #000 100%, transparent 0)',
    backgroundSize: '48px 15px , 15px 35px, 15px 35px, 25px 15px, 28px 28px',
    backgroundPosition: '25px 5px, 58px 20px, 25px 17px, 2px 37px, 76px 0px',
    backgroundRepeat: 'no-repeat',
    position: 'relative',
    transform: 'rotate(-45deg)',
    boxSizing: 'border-box',
  },
  '.biker::after, .biker::before': {
    content: "''",
    position: 'absolute',
    width: '56px',
    height: '56px',
    border: '6px solid #000',
    borderRadius: '50%',
    left: '-45px',
    top: '-10px',
    backgroundRepeat: 'no-repeat',
    backgroundImage:
      'linear-gradient(#000 64px, transparent 0), linear-gradient(#000 66px, transparent 0), radial-gradient(circle 4px, #000 100%, transparent 0)',
    backgroundSize: '40px 1px , 1px 40px, 8px 8px',
    backgroundPosition: 'center center',
    boxSizing: 'border-box',
    animation: 'rotation 0.3s linear infinite',
  },
  '.biker::before': {
    left: '25px',
    top: '60px',
  },

  '@keyframes rotation': {
    '0%': {
      transform: 'rotate(0deg)',
    },
    '100%': {
      transform: 'rotate(360deg)',
    },
  },
} as const;

const text = [
  'One sec, I got hit by a bus...',
  'Just wait a second.. better than driving a car and us all dying, right?',
  "I'm pedalling as fast as I can",
  "Get a bike they said, it'll be fun they said 🙄",
  'Jeez, lots of headwind today!',
  'We keep telling them we need more cycleways',
  "We sent a pigeon but it got lost. Don't worry though, we sent Craig",
  'Oh no, my batteries run out!',
  'Be there shortly, I blew a tyre and have to push.. its a real drag.',
  "On the way! I'm just very tyred..",
  'Nearly there, just wheelie tyred.',
  "I need a kickstand. I'm two tyred to stand up on my own.",
  'One sec, I crashed my bike into a wall. It was wheelie unfortunate',
];

export const Biker: FC = () => {
  return (
    <>
      <GlobalStyles styles={styles} />
      <Box
        height="100%"
        width="100%"
        flex={1}
        display="flex"
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
      >
        <span className="biker" />
        <Typography sx={{ marginTop: 5 }}>
          {text[Math.floor(Math.random() * text.length)]}
        </Typography>
      </Box>
    </>
  );
};
