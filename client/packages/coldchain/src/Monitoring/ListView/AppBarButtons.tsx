import React from 'react';
import { AppBarButtonsPortal } from '@common/components';

import { ImportFridgeTag } from '../../common/ImportFridgeTag';

export const AppBarButtons = () => {
  return (
    <AppBarButtonsPortal>
      <ImportFridgeTag shouldShrink={true} />
    </AppBarButtonsPortal>
  );
};
