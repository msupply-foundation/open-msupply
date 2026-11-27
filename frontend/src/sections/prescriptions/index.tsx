import { lazy, Match, Show, Switch } from 'solid-js';
import { Navigate, Route, useLocation, useParams } from '@solidjs/router';
import type { RouteSectionProps } from '@solidjs/router';
import {
  isDispensary,
  prescriptionPreferences,
} from '../../store/storeContext';
import { atSimpleAddress, dispensingScreenRoute } from './dispensingScreen';

// The prescriptions vertical routes (spec/prescriptions), mounted under the
// navConfig path 'dispensary/dispensing' in App.tsx. Views are lazy so the
// section is its own bundle: '/' = the store's dispensing screen (the list,
// or the Simple screen), '/records' = the list, '/simple/:prescriptionId' =
// the Simple screen with a dispensed visit open on it, '/:prescriptionId' =
// the detail.
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
 * other.
 *
 * A Simple store's screen is served at Dispensing's own address, not sent on
 * to '/simple': the address it is reached by is the one it shows, so Escape
 * on it goes up to Home as from any destination (keyboard KB-X5), rather than
 * up to an address that sends it straight back. A dispensed visit open on it
 * stays at '/simple/:prescriptionId', since '/:prescriptionId' is the record
 * screen. Both addresses are one route (below), so going between the screen
 * and a visit never remounts it.
 *
 * In a store that dispenses on the list, the Simple screen's own addresses
 * open the list, and the record's own screen for a dispensed visit (rules › a
 * dispensed visit): staff can't switch screens. The list stays at '/records'
 * too — a Simple store's Dispensing records.
 */
const DispensingScreen = () => {
  const params = useParams<{ storeId: string; prescriptionId?: string }>();
  const location = useLocation();
  const route = () => {
    const screen = prescriptionPreferences().dispensingScreen;
    return screen
      ? dispensingScreenRoute(
          screen,
          atSimpleAddress(location.pathname),
          params.prescriptionId
        )
      : undefined;
  };
  return (
    // Keyed on what opens, never on the address: going between the Simple
    // screen and a visit open on it keeps the one screen.
    <Switch>
      <Match when={route()?.kind === 'simple'}>
        <SimpleDispensingPage />
      </Match>
      <Match when={route()?.kind === 'list'}>
        <PrescriptionsList />
      </Match>
      {/* The redirect itself, not its path: '' (Dispensing's own address)
          is falsy. */}
      <Match
        when={(() => {
          const opens = route();
          return opens?.kind === 'redirect' ? opens : undefined;
        })()}
      >
        {opens => (
          <Navigate
            href={`/${params.storeId}/dispensary/dispensing${opens().to}`}
          />
        )}
      </Match>
    </Switch>
  );
};

export const prescriptionsRoutes = () => (
  <Route path="/" component={DispensaryOnly}>
    {/* One route for the store's screen and a dispensed visit open on the
        Simple screen: a route's paths share one key, so going between them
        never remounts the screen. Static segments outrank the
        :prescriptionId param, so "records" and "simple" are never read as
        record ids. */}
    <Route
      path={['/', '/simple/:prescriptionId?']}
      component={DispensingScreen}
    />
    <Route path="/records" component={PrescriptionsList} />
    <Route path="/:prescriptionId" component={PrescriptionDetailView} />
  </Route>
);
