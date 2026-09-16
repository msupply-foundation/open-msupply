import {
  createEffect,
  createMemo,
  createResource,
  createSignal,
  on,
  type Accessor,
} from 'solid-js';
import { createStore, type Store } from 'solid-js/store';
import { reportPermissionDenied } from '@/api/graphql';
import type { Rejection } from '@/api/rejection';
import { hasPermission } from '@/store/storeContext';
import { generateUUID } from '@/uuid';
import {
  loadDemographics,
  saveDemographics,
  type LoadedDemographics,
} from './demographicsApi';
import {
  GENERAL_ROW_ID,
  baselineOf,
  emptyDraft,
  newIndicator,
  rateKey,
  saveInputs,
  toDraft,
  type Draft,
  type Year,
} from './draft';

// The screen's state and behaviour, minus rendering (spec/demographics rules
// § editing the draft, § saving the draft, § access): the load, the one draft
// every edit lands in, New indicator, Cancel, Save, and the up-front
// permission mirror. The page composes library components over this; keeping
// the behaviour here makes every rule node-testable against a stubbed wire,
// the shape the patient editor (patientEditor.ts) established.

/**
 * The server's permission name in the PascalCase the permission-denied modal
 * humanises — the form an actual Forbidden's `HasPermission(EditCentralData)`
 * carries, so the client's up-front refusal and the server's read the same.
 */
const EDIT_CENTRAL_DATA = 'EditCentralData';

export interface DemographicsEditorParams {
  storeId: Accessor<string>;
  /**
   * The screen's own label for the general population row, resolved by the
   * caller (a `t()` read) — sent back as the row's stored name on Save (rules §
   * the general population row).
   */
  generalPopulationName: Accessor<string>;
}

export interface DemographicsEditor {
  draft: Store<Draft>;
  /** The first load (or a reload) is in flight. */
  loading: Accessor<boolean>;
  /** The load failed and nothing is on screen to edit. */
  loadFailed: Accessor<boolean>;
  /** The draft has an edit or an added row since the last load. */
  dirty: Accessor<boolean>;
  saving: Accessor<boolean>;
  /** The last Save's domain rejection, until the next Save or Cancel. */
  rejection: Accessor<Rejection | undefined>;
  /** The general population row's current population. */
  baseline: Accessor<number>;
  setName: (id: string, name: string) => void;
  setShare: (id: string, share: number | undefined) => void;
  setBaseline: (baseline: number | undefined) => void;
  setRate: (year: Year, rate: number | undefined) => void;
  /** New indicator — refused up front without the permission. */
  addIndicator: () => void;
  /** Discard the draft: back to the last loaded values, new rows gone. */
  cancel: () => void;
  /** Save — refused up front without the permission; reloads on success. */
  save: () => Promise<void>;
}

export const createDemographicsEditor = (
  params: DemographicsEditorParams
): DemographicsEditor => {
  // One read per store (the store id is the read's auth plumbing, not a
  // filter). Read NON-SUSPENDING everywhere below (kdd/solid-reactivity-
  // pitfalls § no remounts on interaction): the post-save reload refetches on
  // an already-open screen, so a direct `loaded()` read would suspend the
  // page's boundary and tear down the grid mid-edit. The safe read gates on
  // `.state`; `.latest` alone is not safe.
  const [loaded, { refetch }] = createResource(
    params.storeId,
    loadDemographics
  );
  // A memo, so the ready → refreshing → ready state churn of a refetch — which
  // keeps the SAME latest value until the new one lands — notifies nobody:
  // the seed below must run once per answer, not once per state flip.
  const settled = createMemo<LoadedDemographics | undefined>(() =>
    loaded.state === 'ready' || loaded.state === 'refreshing'
      ? loaded.latest
      : undefined
  );

  // The draft: every cell edit, rate edit and added row is local until Save
  // (rules § editing the draft). A store updated field-by-field, so a
  // keystroke re-renders one cell, never the grid (kdd/solid-reactivity-
  // pitfalls § editable collections).
  const [draft, setDraft] = createStore<Draft>(emptyDraft());
  const [dirty, setDirty] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [rejection, setRejection] = createSignal<Rejection>();

  // Seed from what the server answered — on the first load, after a save's
  // reload, and for Cancel. Clean by definition: the draft now IS the server.
  // The answer last seeded is remembered so the load effect and Save's own
  // explicit reseed never seed one answer twice.
  let seeded: LoadedDemographics | undefined;
  const seed = (data: LoadedDemographics) => {
    seeded = data;
    setDraft(toDraft(data.indicators, data.projection));
    setDirty(false);
    setRejection(undefined);
  };
  createEffect(
    on(settled, data => {
      if (data && data !== seeded) seed(data);
    })
  );

  const loadFailed = () =>
    loaded.state === 'ready' && loaded.latest === undefined;

  const canEdit = () => hasPermission('EDIT_CENTRAL_DATA');

  // The standing-capability mirror (rules § access; startup § permission
  // denied): a user without the central-data permission is refused at the
  // click, with the same modal the server's own refusal raises, and nothing is
  // added or sent. The server stays the real guard.
  const permitted = (): boolean => {
    if (canEdit()) return true;
    reportPermissionDenied([EDIT_CENTRAL_DATA]);
    return false;
  };

  const baseline = () => baselineOf(draft.indicators);

  const touch = () => setDirty(true);

  const setName = (id: string, name: string) => {
    setDraft('indicators', row => row.id === id, 'name', name);
    touch();
  };

  // A cleared numeric cell reads as zero (rules § input bounds) — the field
  // hands up `undefined` for empty, the draft never holds one.
  const setShare = (id: string, share: number | undefined) => {
    setDraft(
      'indicators',
      row => row.id === id,
      'populationPercentage',
      share ?? 0
    );
    touch();
  };

  const setBaseline = (value: number | undefined) => {
    setDraft(
      'indicators',
      row => row.id === GENERAL_ROW_ID,
      'basePopulation',
      value ?? 0
    );
    touch();
  };

  const setRate = (year: Year, rate: number | undefined) => {
    setDraft('rates', rateKey(year), rate ?? 0);
    touch();
  };

  // Appends a blank row at the END of the grid (rules § editing the draft) —
  // not re-sorted into name order until a save's reload places it.
  const addIndicator = () => {
    if (!permitted()) return;
    setDraft('indicators', rows => [
      ...rows,
      newIndicator(generateUUID(), draft.newRowBaseYear),
    ]);
    touch();
  };

  // Cancel throws the draft away and goes back to the server's last answer.
  // When there ISN'T one — the load failed — it empties the draft instead of
  // doing nothing: a click that visibly does nothing is a blocked affordance
  // (ui-standards controls § blocked affordances), and leaving a dirty draft
  // behind would have the leave guard prompt on every navigation with no way
  // to clear it. The page keeps Cancel unavailable while the draft is clean,
  // so this is reached only by a save whose RELOAD then failed.
  const cancel = () => {
    const data = settled();
    if (data) {
      seed(data);
      return;
    }
    setDraft(emptyDraft());
    setDirty(false);
    setRejection(undefined);
  };

  // Save writes every row, then the rates; success is the RELOAD — the grid
  // re-seeded from the server, Save and Cancel falling back to unavailable
  // (ui-surface S1 § saved; controls › action feedback: no toast). A rejection
  // keeps the draft on screen and dirty for correction and retry, with the
  // reason in the footer notice; a refusal or transport failure has already
  // raised its global modal, so only the busy state is released.
  const save = async () => {
    if (saving() || !dirty()) return;
    if (!permitted()) return;
    setSaving(true);
    setRejection(undefined);
    const outcome = await saveDemographics(
      saveInputs(draft, params.generalPopulationName(), generateUUID)
    );
    if (outcome.kind !== 'saved' && outcome.acceptedNewIds.length > 0) {
      // Rows persist independently: the new rows the server DID accept now
      // exist, so a retry must update them rather than insert them again —
      // which the server would refuse as _already exists_.
      const accepted = new Set(outcome.acceptedNewIds);
      setDraft('indicators', row => accepted.has(row.id), 'isNew', false);
    }
    if (outcome.kind === 'saved') {
      // Reseeded from the answer itself, not from the resource settling: the
      // grid must be clean the moment Save releases, whatever the resource's
      // notification timing.
      const data = await refetch();
      if (data) seed(data);
    } else if (outcome.kind === 'rejected') setRejection(outcome.rejection);
    setSaving(false);
  };

  return {
    draft,
    loading: () => loaded.loading,
    loadFailed,
    dirty,
    saving,
    rejection,
    baseline,
    setName,
    setShare,
    setBaseline,
    setRate,
    addIndicator,
    cancel,
    save,
  };
};
