import React, { FC } from 'react';
import { RouteBuilder, Routes, Route } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

export const ImmunisationService: FC = () => {
  const immunisationsRoute = RouteBuilder.create(
    AppRoute.Immunisations
  ).build();
  //   const immunisationRoute = RouteBuilder.create(AppRoute.Immunisations)
  //     .addPart(':id')
  //     .build();

  return (
    <Routes>
      <Route path={immunisationsRoute} element={<></>} />
      {/* <Route path={masterListRoute} element={<ImmunisationDetailView />} /> */}
    </Routes>
  );
};

export default ImmunisationService;
