import React from 'react';
import { CssBaseline } from '@openmsupply-client/common';

const Viewport: React.FC = props => {
  return (
    <React.Fragment>
      <CssBaseline />
      {props.children}
    </React.Fragment>
  );
};

export default Viewport;
