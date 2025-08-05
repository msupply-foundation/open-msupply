import React from 'react';
import { AppBarButtons } from './AppBarButtons';
import { Footer } from './Footer';
import { Toolbar } from './Toolbar';

export const GoodsReceivedListView: React.FC = () => {
  return (
    <div>
      <Toolbar />
      <AppBarButtons />
      <div>Goods Received List (to be implemented)</div>
      <Footer />
    </div>
  );
};
