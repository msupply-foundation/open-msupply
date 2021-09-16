import React from 'react';
import { GlobalStyles, CssBaseline } from '@openmsupply-client/common';

const globalStyles = {
  '*:-webkit-full-screen': {
    height: '100%',
    width: '100%',
  },
  '#root': {
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
  },
  html: { position: 'fixed' },
  'html, body': {
    height: '100%',
    width: '100%',
  },
} as const;

const Viewport: React.FC = props => {
  return (
    <React.Fragment>
      <GlobalStyles styles={globalStyles} {...props} />
      <CssBaseline />
      {props.children}
    </React.Fragment>
  );
};

export default Viewport;
