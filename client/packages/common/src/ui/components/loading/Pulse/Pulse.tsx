import React, { FC } from 'react';
import { Box, GlobalStyles } from '@mui/material';
import { styled } from '@mui/material/styles';

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

const StyledSvg = styled('svg')(({ theme }) => ({
  stroke: theme.palette.primary.main,
}));

const styles = {
  '.pulse-spinner': {
    strokeDasharray: '250 550',
    animation: 'dash 6s infinite linear forwards',
  },
  '@-webkit-keyframes dash': {
    from: {
      strokeDashoffset: 814,
    },
    to: {
      strokeDashoffset: -814,
    },
  },
  '@keyframes dash': {
    from: {
      strokeDashoffset: 814,
    },
    to: {
      strokeDashoffset: -814,
    },
  },
};

export const Pulse: FC = () => (
  <Container>
    <GlobalStyles styles={styles} />
    <StyledSvg height="210" width="260">
      <path
        className="pulse-spinner"
        fill="none"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M0,90L100,90Q107,60 112,87T117,95 120,88 123,92t6,35 7,-60T140,127 147,107s2,-11 10,-10 1,1 8,-10T169,95c6,4 8,-6 10,-17s2,10 9,11h80"
      />
    </StyledSvg>
  </Container>
);
