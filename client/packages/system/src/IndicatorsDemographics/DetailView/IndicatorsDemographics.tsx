import React, { FC } from 'react';
import { AppBarButtons } from './AppBarButtons';
import { Toolbar } from './Toolbar';

export const IndicatorsDemographicsComponent: FC = () => {
  return (
    <>
      <AppBarButtons></AppBarButtons>
      <Toolbar></Toolbar>
    </>
  );
};

export const IndicatorsDemographics: FC = () => {
  // placeholder for store
  return (
    <>
      <IndicatorsDemographicsComponent />;
    </>
  );
};
