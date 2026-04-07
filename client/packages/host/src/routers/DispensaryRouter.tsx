import React, { FC, useMemo } from 'react';
import {
  RouteBuilder,
  Navigate,
  matchPath,
  useLocation,
  useMatch,
  usePluginProvider,
} from '@openmsupply-client/common';
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
const ClinicianService = React.lazy(
  () => import('@openmsupply-client/system/src/Clinician/Service')
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

const fullCliniciansPath = RouteBuilder.create(AppRoute.Dispensary)
  .addPart(AppRoute.Clinicians)
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
  const location = useLocation();
  const { plugins, pluginsInitialised } = usePluginProvider();
  const gotoDistribution = useMatch(fullPrescriptionPath);
  const gotoPatients = useMatch(fullPatientsPath);
  const gotoEncounters = useMatch(fullEncountersPath);
  const gotoClinicians = useMatch(fullCliniciansPath);
  const gotoContactTraces = useMatch(fullContactTracesPath);
  const gotoContactTracesList = useMatch(contactTracesListPath);
  const dispensaryPluginPage = useMemo(
    () =>
      plugins.dispensary?.page?.find(({ path }) => {
        const fullPath = RouteBuilder.create(AppRoute.Dispensary)
          .addPart(path)
          .build();
        return (
          !!matchPath({ path: fullPath, end: true }, location.pathname) ||
          !!matchPath({ path: `${fullPath}/*` }, location.pathname)
        );
      }),
    [location.pathname, plugins.dispensary?.page]
  );

  if (gotoDistribution) {
    return <InvoiceService />;
  }

  if (dispensaryPluginPage) {
    const Component = dispensaryPluginPage.Component;
    return <Component />;
  }

  if (gotoPatients) {
    return <PatientService />;
  }

  if (gotoEncounters) {
    return <EncounterService />;
  }

  if (gotoClinicians) {
    return <ClinicianService />;
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

  if (!pluginsInitialised) {
    return null;
  }

  const notFoundRoute = RouteBuilder.create(AppRoute.PageNotFound).build();
  return <Navigate to={notFoundRoute} />;
};
