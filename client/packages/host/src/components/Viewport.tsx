import React from 'react';
import { GlobalStyles, CssBaseline } from '@openmsupply-client/common';
import { PropsWithChildrenOnly } from '@common/types';

const globalStyles = {
  '*:-webkit-full-screen': {
    height: '100%',
    width: '100%',
  },
  '#root': {
    height: '100vh',
    width: '100vw',
    display: 'flex',
    flexDirection: 'column',
  },
  html: { position: 'fixed' },
  'html, body': {
    height: '100%',
    width: '100%',
  },
} as const;

export const Viewport: React.FC<PropsWithChildrenOnly> = props => {
  return (
    <React.Fragment>
      <GlobalStyles styles={globalStyles} {...props} />
      <CssBaseline />
      {props.children}
    </React.Fragment>
  );
};

export default Viewport;
