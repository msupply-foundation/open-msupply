import React, { useEffect, useState } from 'react';
import {
  GlobalStyles,
  CssBaseline,
  EnvUtils,
  Platform,
} from '@openmsupply-client/common';
import { PropsWithChildrenOnly } from '@common/types';

// there is an issue on mobile devices when using viewport units (e.g. vh)
// "Using vh will size the element as if the URL bar is always hidden while using % will size the element as if the URL bar were always showing."
// the result is that using `100vh` on mobile devices will give you a greater height than is visible, and the bottom of the page will be cut off
const getHeight = () =>
  EnvUtils.platform === Platform.Android ? `${window.innerHeight}px` : '100vh';

export const Viewport: React.FC<PropsWithChildrenOnly> = props => {
  const [height, setHeight] = useState(getHeight());
  const handleResize = () => setHeight(getHeight());

  const globalStyles = {
    '*:-webkit-full-screen': {
      height: '100%',
      width: '100%',
    },
    '#root': {
      height,
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

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <React.Fragment>
      <GlobalStyles styles={globalStyles} {...props} />
      <CssBaseline />
      {props.children}
    </React.Fragment>
  );
};

export default Viewport;
