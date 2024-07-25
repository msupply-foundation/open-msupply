import React, { FC } from 'react';
import { RouteBuilder, Navigate, useMatch } from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';

const InvoiceService = React.lazy(
  () => import('@openmsupply-client/invoices/src/InvoiceService')
);

const PatientService = React.lazy(
  () => import('@openmsupply-client/system/src/Patient/Service')
);

const EncounterService = React.lazy(
  () => import('@openmsupply-client/system/src/Encounter/Service')
);

const ContactTraceService = React.lazy(
  () => import('@openmsupply-client/system/src/ContactTrace/Service')
);

const fullPrescriptionPath = RouteBuilder.create(AppRoute.Dispensary)
  .addPart(AppRoute.Prescription)
  .addWildCard()
  .build();

const fullPatientsPath = RouteBuilder.create(AppRoute.Dispensary)
  .addPart(AppRoute.Patients)
  .addWildCard()
  .build();

const fullEncountersPath = RouteBuilder.create(AppRoute.Dispensary)
  .addPart(AppRoute.Encounter)
  .addWildCard()
  .build();

const fullContactTracesPath = RouteBuilder.create(AppRoute.Dispensary)
  .addPart(AppRoute.ContactTrace)
  .addWildCard()
  .build();

const contactTracesListPath = RouteBuilder.create(AppRoute.Dispensary)
  .addPart(AppRoute.ContactTrace)
  .build();

export const DispensaryRouter: FC = () => {
  const gotoDistribution = useMatch(fullPrescriptionPath);
  const gotoPatients = useMatch(fullPatientsPath);
  const gotoEncounters = useMatch(fullEncountersPath);
  const gotoContactTraces = useMatch(fullContactTracesPath);
  const gotoContactTracesList = useMatch(contactTracesListPath);

  if (gotoDistribution) {
    return <InvoiceService />;
  }

  if (gotoPatients) {
    return <PatientService />;
  }

  if (gotoEncounters) {
    return <EncounterService />;
  }
  if (gotoContactTracesList) {
    const patientListRoute = RouteBuilder.create(AppRoute.Dispensary)
      .addPart(AppRoute.Patients)
      .build();
    return <Navigate to={patientListRoute} />;
  }

  if (gotoContactTraces) {
    return <ContactTraceService />;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
