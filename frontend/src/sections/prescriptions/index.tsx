import { lazy, Match, Show, Switch } from 'solid-js';
import { Navigate, Route, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import {
  isDispensary,
  prescriptionPreferences,
} from '../../store/storeContext';

// The prescriptions vertical routes (spec/prescriptions), mounted under the
// navConfig path 'dispensary/dispensing' in App.tsx. Views are lazy so the
// section is its own bundle: '/' = the store's dispensing screen, '/records'
// = the list, '/simple' = the Simple screen ('/simple/:prescriptionId' with a
// dispensed visit open on it), '/:prescriptionId' = the detail.
const PrescriptionsList = lazy(() => import('./list/PrescriptionsList'));
const SimpleDispensingPage = lazy(
  () => import('./simple/SimpleDispensingPage')
);
const PrescriptionDetailView = lazy(
  () => import('./detail/PrescriptionDetailView')
);

// Dispensary-mode gate (the patients section's guard, shared reflex): the
// whole dispensing surface is reachable only in dispensary mode — the nav
// group is hidden elsewhere and this layout route blocks direct-URL entry.
const DispensaryOnly = (props: RouteSectionProps) => {
  const params = useParams<{ storeId: string }>();
  return (
    <Show
      when={isDispensary()}
      fallback={<Navigate href={`/${params.storeId}`} />}
    >
      {props.children}
    </Show>
  );
};

/*
 * Dispensing opens on the store's own screen (spec/prescriptions rules › the
 * Simple screen): the list, or the Simple screen. Nothing until the store's
 * preferences are known, so it never opens one screen and then jumps to the
 * other. The list stays at '/records' too — a Simple store's Dispensing
 * records — so the menu, breadcrumbs and links that name '/' still open the
 * store's screen.
 */
const DispensingHome = () => {
  const params = useParams<{ storeId: string }>();
  return (
    <Switch>
      <Match when={prescriptionPreferences().dispensingScreen === 'SIMPLE'}>
        <Navigate href={`/${params.storeId}/dispensary/dispensing/simple`} />
      </Match>
      <Match when={prescriptionPreferences().dispensingScreen === 'STANDARD'}>
        <PrescriptionsList />
      </Match>
    </Switch>
  );
};

/* Staff can't switch screens: in a store that dispenses on the list, the
   Simple screen's address opens the list, and its address for a dispensed
   visit opens that record's own screen (rules › a dispensed visit). */
const SimpleOnly = () => {
  const params = useParams<{ storeId: string; prescriptionId?: string }>();
  return (
    <Switch>
      <Match when={prescriptionPreferences().dispensingScreen === 'SIMPLE'}>
        <SimpleDispensingPage />
      </Match>
      <Match when={prescriptionPreferences().dispensingScreen === 'STANDARD'}>
        <Navigate
          href={`/${params.storeId}/dispensary/dispensing${
            params.prescriptionId ? `/${params.prescriptionId}` : ''
          }`}
        />
      </Match>
    </Switch>
  );
};

export const prescriptionsRoutes = () => (
  <Route path="/" component={DispensaryOnly}>
    <Route path="/" component={DispensingHome} />
    {/* Static segments outrank the :prescriptionId param, so "records" and
        "simple" are never read as record ids. */}
    <Route path="/records" component={PrescriptionsList} />
    {/* One route for the screen and a dispensed visit open on it, so
        opening a visit and going back never remounts the screen. */}
    <Route path="/simple/:prescriptionId?" component={SimpleOnly} />
    <Route path="/:prescriptionId" component={PrescriptionDetailView} />
  </Route>
);
