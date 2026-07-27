import { createSignal } from 'solid-js';
import { graphqlFetch } from '../api/graphql';
import {
  StoreContext,
  type StoreContextResult,
} from '../api/storeContext.generated';
import { authUser } from '../auth/authContext';

// Spec (Store Login, Guard 3): store preferences + permissions as global state.
// Callers invoke refetchStoreContext directly — on store entry, and from
// whatever observes a completed sync (kdd/explicit-composition). Failures are
// handled globally and leave the state empty; callers keep showing their
// loading state.

const [storeContext, setStoreContext] = createSignal<StoreContextResult>();

// Fresh-login store-picker gate (spec SL-6). A brand-new login (authContext
// login()) sets this so the store picker is shown even when the URL still names
// a store from a previous session — the user re-picks (unless a store is
// remembered, or they have exactly one). A page refresh restores the session
// via checkAuth() WITHOUT setting it, so the URL is respected and the user stays
// in their store. Cleared once a store is chosen (StoreGuardLayout).
const [forceStorePicker, setForceStorePicker] = createSignal(false);

// The store the loaded context belongs to — keyed on the REQUEST, not derived
// from the response: storePreferences.id is the store id only when the store
// has a preference row; for a store without one the server answers with a
// default row whose id is "" (find_one_by_id_or_default), so a
// response-derived check would never confirm and the store guard would refetch
// forever.
const [loadedStoreId, setLoadedStoreId] = createSignal<string>();

const refetch = async (storeId: string | undefined) => {
  if (!storeId) {
    setStoreContext(undefined);
    setLoadedStoreId(undefined);
    return;
  }

  const result = await graphqlFetch(StoreContext, { storeId });
  if (result.kind !== 'success') {
    setStoreContext(undefined);
    setLoadedStoreId(undefined);
    return;
  }

  setStoreContext(result.data);
  setLoadedStoreId(storeId);
};

// The id of the store the user has currently ENTERED (Guard 3 loaded).
// Reactive and module-level, so store-scoped global caches
// (createStoreScopedResource) can depend on it without a component. Set only
// when the store guard has resolved and authorised the store from the URL and
// its context fetch succeeded — so it is URL-driven in effect
// (kdd/url-structure), and never reports a store whose lookups aren't yet
// valid to fetch. Keyed on the REQUEST (not the response's
// storePreferences.id, which is "" for a store without a preference row).
// Undefined between store switches (guard shows its loading state).
const currentStoreId = () => loadedStoreId();

// The id of the currently authenticated user (Guard 3 loaded). Reactive and
// module-level for the same reason as currentStoreId — so global caches keyed
// by user (the user layer of table config, kdd/table-state) can depend on it
// without a component. `me` is the UserNode union member, so read is
// `me?.userId`; undefined between store switches.
const currentUserId = () => storeContext()?.me?.userId;

// The stocktake display-gate preferences (spec/stocktakes › store-preference
// gates), read from the guard-3 PreferencesNode. Each defaults to `false` while
// the context is still unresolved — the safe default is OFF, so a gated column /
// field never flashes in before the preference is known (mirrors the D7 rule for
// the simplified layout: unresolved ⇒ render the plainer surface). Reactive, so
// a post-sync refetch re-gates the affected surfaces in place.
const stocktakePreferences = () => {
  const prefs = storeContext()?.preferences;
  return {
    manageVaccinesInDoses: prefs?.manageVaccinesInDoses ?? false,
    manageVvmStatusForStock: prefs?.manageVvmStatusForStock ?? false,
    allowTrackingOfStockByDonor: prefs?.allowTrackingOfStockByDonor ?? false,
  };
};

// The stock vertical's display-gate preferences (spec/stock › store-preference
// gates). A superset of stocktakePreferences: the same three shared gates PLUS
// sortByVvmStatusThenExpiry (the VVM status FIELD shows on S2/S3 when this OR
// manageVvmStatusForStock is on) and the global backdating window (the S4
// adjust-date control appears only when inventoryAdjustmentsEnabled, bounded by
// maxDays). Each defaults OFF/0 while the context is unresolved — the safe
// default is a plainer surface, so a gated field/control never flashes in
// before its preference is known. Reactive, so a post-sync refetch re-gates in
// place. maxDays === 0 means "no maximum" (the server enforces the real bound).
const stockPreferences = () => {
  const prefs = storeContext()?.preferences;
  const backdating = prefs?.backdating;
  return {
    manageVaccinesInDoses: prefs?.manageVaccinesInDoses ?? false,
    manageVvmStatusForStock: prefs?.manageVvmStatusForStock ?? false,
    allowTrackingOfStockByDonor: prefs?.allowTrackingOfStockByDonor ?? false,
    sortByVvmStatusThenExpiry: prefs?.sortByVvmStatusThenExpiry ?? false,
    backdating: {
      inventoryAdjustmentsEnabled:
        backdating?.inventoryAdjustmentsEnabled ?? false,
      maxDays: backdating?.maxDays ?? 0,
    },
  };
};

// The inbound-shipment display/behaviour gate preferences
// (spec/inbound-shipments › store-preference gates). Same safe-default-OFF rule
// as stocktakePreferences: each is `false` (or a zero window) while the context
// is unresolved so a gated column/control never flashes in before the
// preference is known. Reactive — a post-sync refetch re-gates in place.
// `donorTracking`/`vvm`/`vaccinesInDoses` overlap the stocktake gates; the
// inbound-only ones (procurement, authorisation, foreign currency, backdating,
// pack-to-one, manual internal-order linking) ride the same guard-3 query.
const inboundShipmentPreferences = () => {
  const prefs = storeContext()?.preferences;
  const store = storeContext()?.storePreferences;
  return {
    manageVaccinesInDoses: prefs?.manageVaccinesInDoses ?? false,
    manageVvmStatusForStock: prefs?.manageVvmStatusForStock ?? false,
    allowTrackingOfStockByDonor: prefs?.allowTrackingOfStockByDonor ?? false,
    useProcurementFunctionality: prefs?.useProcurementFunctionality ?? false,
    externalInboundShipmentLinesMustBeAuthorised:
      prefs?.externalInboundShipmentLinesMustBeAuthorised ?? false,
    backdatingEnabled: prefs?.backdating?.shipmentsEnabled ?? false,
    backdatingMaxDays: prefs?.backdating?.maxDays ?? 0,
    packToOne: store?.packToOne ?? false,
    issueInForeignCurrency: store?.issueInForeignCurrency ?? false,
    manuallyLinkInternalOrderToInboundShipment:
      store?.manuallyLinkInternalOrderToInboundShipment ?? false,
  };
};

// The patient vertical's configuration gates (spec/patients § configuration
// gates). `omProgramModule` (StorePreferenceNode) gates the program-related
// surfaces — the list's Program-enrolments column/filter and the detail's
// Programs/Encounters/Vaccinations tabs; `genderOptions` (PreferencesNode) is
// the configured subset of genders every gender picker offers. Both default to
// the safe OFF/empty while the context is unresolved so a gated surface never
// flashes in before its preference is known (the same rule as the other
// *Preferences accessors). Reactive — a post-sync refetch re-gates in place.
// The WHOLE-surface dispensary gate (AC-G1) is `isDispensary` below.
const patientPreferences = () => {
  const prefs = storeContext()?.preferences;
  const store = storeContext()?.storePreferences;
  return {
    programModule: store?.omProgramModule ?? false,
    genderOptions: prefs?.genderOptions ?? [],
  };
};

// The prescriptions display/affordance gates (spec/prescriptions §
// store-preference gates): the allocation-shaping trio (doses / VVM /
// expired-issue) + the ordering variant, the list's status-options set, and
// the legacy store preference gating the prescribed-quantity field/column.
// Same safe defaults while unresolved as the other *Preferences accessors —
// OFF for gated columns/fields, but `invoiceStatusOptions` empty means
// UNRESTRICTED (every status offered until the real value resolves — the
// permissive default, DIVERGENCES D7's precedent via AC-PR2). Reactive — a
// post-sync refetch re-gates in place.
const prescriptionPreferences = () => {
  const prefs = storeContext()?.preferences;
  const store = storeContext()?.storePreferences;
  return {
    manageVaccinesInDoses: prefs?.manageVaccinesInDoses ?? false,
    manageVvmStatusForStock: prefs?.manageVvmStatusForStock ?? false,
    sortByVvmStatusThenExpiry: prefs?.sortByVvmStatusThenExpiry ?? false,
    expiredStockPreventIssue: prefs?.expiredStockPreventIssue ?? false,
    expiredStockIssueThreshold: prefs?.expiredStockIssueThreshold ?? 0,
    invoiceStatusOptions: prefs?.invoiceStatusOptions ?? [],
    // Unset/unresolved → SHOWN (the permissive default, matching the reference
    // app's `?? true`): the prescribed-quantity field is a data-capture
    // affordance the user expects; an explicit `false` hides it
    // (spec/prescriptions § store-preference gates).
    editPrescribedQuantity: store?.editPrescribedQuantityOnPrescription ?? true,
  };
};

// The entered store's dispensary gate (spec/patients § configuration gates ›
// AC-G1). Dispensary mode gates the WHOLE patient surface — the Dispensary nav
// group (ShellLayout) and its routes (the patients section's route guard). The
// store's mode rides the me/login response's store list
// (UserStoreNode.storeMode), so it is known before any store is entered; the
// entered store is the one `currentStoreId` names. Every gated surface renders
// under StoreGuardLayout, which withholds its children until the context has
// loaded, so callers read a settled value. Safe default OFF (not dispensary)
// while the store is unresolved, so the patient surface never shows for a
// non-dispensary store. Reactive — reads authUser + currentStoreId.
const isDispensary = (): boolean => {
  const storeId = currentStoreId();
  const store = authUser()?.stores.nodes.find(s => s.id === storeId);
  return store?.storeMode === 'DISPENSARY';
};

// A server UserPermission name as it arrives in the store-context query
// (SCREAMING_CASE — e.g. "EDIT_CENTRAL_DATA"), narrowed to the enum the codegen
// generated so callers can't typo a permission. Reading the union off the
// generated result keeps this in lock-step with the schema (kdd/type-safety).
type UserPermission = NonNullable<
  StoreContextResult['me'] & { __typename: 'UserNode' }
>['permissions']['nodes'][number]['permissions'][number];

// Whether the current user holds a permission in the entered store. Reactive
// (reads storeContext), so gates re-evaluate when the context loads or the
// store changes. The permissions query is already scoped to the entered store
// (storeContext.graphql passes $storeId), so any node's list applies — we flat-
// check across nodes rather than matching storeId again. Empty/undefined
// context → false (nothing to grant).
const hasPermission = (permission: UserPermission): boolean => {
  const me = storeContext()?.me;
  if (!me || me.__typename !== 'UserNode') return false;
  return me.permissions.nodes.some(node =>
    node.permissions.includes(permission)
  );
};

export {
  storeContext,
  refetch as refetchStoreContext,
  forceStorePicker,
  setForceStorePicker,
  currentStoreId,
  currentUserId,
  stocktakePreferences,
  stockPreferences,
  inboundShipmentPreferences,
  patientPreferences,
  prescriptionPreferences,
  isDispensary,
  hasPermission,
};
export type { UserPermission };
