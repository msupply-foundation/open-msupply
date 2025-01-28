import React from 'react';
import { GlobalStyles, CssBaseline } from '@openmsupply-client/common';
import { PropsWithChildrenOnly } from '@common/types';

export const Viewport: React.FC<PropsWithChildrenOnly> = props => {
  const globalStyles = {
    '*:-webkit-full-screen': {
      height: '100%',
      width: '100%',
    },
    '#root': {
      width: '100vw',
      display: 'flex',
      flexDirection: 'column',
      position: 'absolute',
      top: '0',
      bottom: '0',
      left: '0',
      right: '0',
    },
    body: {
      // displaying as table (and introducing the below wrappers around #root)
      // makes page responsive to injected popups like the Bitwarden one
      display: 'table',
      height: '100vh',
      width: '100%',
    },
    '#content-row': {
      display: 'table-row',
      height: '100%',
    },
    '#outer-wrapper': {
      display: 'table-cell',
      height: '100%',
    },
    '#inner-wrapper': {
      height: '100%',
      width: '100vw',
      position: 'relative',
      overflow: 'auto',
    },
    html: { position: 'fixed' },
    'html, body': {
      height: '100%',
      width: '100%',
    },
  } as const;

  return (
    <React.Fragment>
      <GlobalStyles styles={globalStyles} {...props} />
      <CssBaseline />
      {props.children}
    </React.Fragment>
  );
};

export default Viewport;
