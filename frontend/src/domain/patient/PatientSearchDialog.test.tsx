import {
  children,
  createRoot,
  createSignal,
  onCleanup,
  type JSX,
} from 'solid-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * The patient search (spec/patients S2 step ①; cases OMS-REG-DIS-01 `.55`–
 * `.58`, `.61`, `.69`, `.70`, `.73`, `.74`, and OMS-REG-DIS-03 `.84`). The
 * dialog's own logic runs for real — the debounce (on fake timers), the
 * token checks, when other facilities are asked and what New patient hands
 * on. The library components are stand-ins that keep
 * the props they were given, so the test reads the fields, tables, buttons
 * and warnings as rendered and acts through their callbacks. The searches
 * are mocked, each answering when the test says so.
 *
 * The suite runs without a DOM (vitest.workspace.ts); the dialog's two plain
 * elements (the local table's wrapper and the warning's text) are made by a
 * stand-in `document` that just keeps their text.
 */

// ---- a stand-in document, for the dialog's own <div> and <span>s ----

class FakeNode {
  firstChild: { data: string } | null = null;
  nextSibling = null;
  get textContent() {
    return this.firstChild?.data ?? '';
  }
  set textContent(value: string) {
    this.firstChild = value === '' ? null : { data: String(value) };
  }
  cloneNode() {
    const node = new FakeNode();
    nodes.add(node);
    return node;
  }
  scrollIntoView() {}
}
const nodes = new Set<FakeNode>();
const texts = () => [...nodes].map(n => n.textContent);

// ---- the library stand-ins ----

type Props = Record<string, unknown>;
type Recorded = { props: Props; resolved: Record<string, () => unknown> };

/** Each stand-in rendered now, removed when its owner is cleaned up. */
const rendered = {
  buttons: new Set<Props>(),
  fields: new Set<Props>(),
  tables: new Set<Recorded>(),
  stacks: new Set<Props>(),
  alerts: new Set<Props>(),
  tooltips: new Set<Props>(),
};

// Resolve a JSX prop as the real component would insert it, once, reactively.
const resolve = (p: Props, keys: string[]) =>
  Object.fromEntries(
    keys.map(k => [k, children(() => p[k] as JSX.Element) as () => unknown])
  );

const keep = <T,>(set: Set<T>, value: T) => {
  set.add(value);
  onCleanup(() => set.delete(value));
};

vi.mock('../../ui/elements/feedback/Dialog', () => ({
  Dialog: (p: Props) => {
    dialogProps = p;
    const r = resolve(p, [
      'children',
      'headerActions',
      'actionsLead',
      'actions',
    ]);
    return () => Object.values(r).map(f => f());
  },
}));
vi.mock('../../ui/elements/feedback/Alert', () => ({
  Alert: (p: Props) => {
    keep(rendered.alerts, p);
    return resolve(p, ['children']).children;
  },
}));
vi.mock('../../ui/elements/feedback/InfoTooltip', () => ({
  InfoTooltip: (p: Props) => {
    keep(rendered.tooltips, p);
    return 'tooltip';
  },
}));
vi.mock('../../ui/elements/buttons/Button', () => ({
  Button: (p: Props) => {
    keep(rendered.buttons, p);
    return 'button';
  },
}));
vi.mock('../../ui/elements/buttons/StandardButtons', () => ({
  CancelButton: (p: Props) => {
    keep(rendered.buttons, p);
    return 'cancel';
  },
}));
vi.mock('../../ui/elements/inputs/TextField', () => ({
  TextField: (p: Props) => {
    keep(rendered.fields, p);
    return 'field';
  },
}));
vi.mock('../../ui/elements/table/DataTable', () => ({
  DataTable: (p: Props) => {
    keep(rendered.tables, {
      props: p,
      resolved: resolve(p, ['filters', 'empty']),
    });
    return null;
  },
}));
const passThrough = (p: Props) => resolve(p, ['children']).children;
vi.mock('../../ui/layout/Stack/Stack', () => ({
  Stack: (p: Props) => {
    keep(rendered.stacks, p);
    return passThrough(p);
  },
}));
vi.mock('../../ui/layout/Stack/HStack', () => ({
  HStack: (p: Props) => passThrough(p),
}));
vi.mock('../../ui/layout/Form/FormRow', () => ({
  FormRow: (p: Props) => passThrough(p),
}));
vi.mock('../../ui/elements/typography/Text', () => ({
  Text: (p: Props) => passThrough(p),
}));
vi.mock('../../ui/elements/feedback/EmptyState', () => ({
  EmptyState: () => 'empty',
}));
vi.mock('../../ui/elements/feedback/Spinner', () => ({
  Spinner: () => 'spinner',
}));
vi.mock('../../ui/icons', () => ({
  PlusCircleIcon: () => 'icon',
  RefreshIcon: () => 'icon',
  SearchIcon: () => 'icon',
}));
vi.mock('../../ui/utils/createFocusTarget', () => ({
  createFocusTarget: () => ({ ref: () => {} }),
}));
vi.mock('../../ui/utils/createMediaQuery', () => ({
  smoothScrollOptions: (o: unknown) => o,
}));
vi.mock('./patientFindColumns', () => ({ patientFindColumns: () => [] }));
vi.mock('../../intl', () => ({
  t: (key: string) => key,
  localeDateFormat: () => 'dd/MM/yyyy',
}));

// The props the dialog stand-in was last given (dismissable, …).
let dialogProps: Props = {};

let central = false;
vi.mock('../../api/serverInfo', () => ({ isCentralServer: () => central }));

// Whether the user can read dispensing records (recent patients need it).
let canReadDispensing = true;
// Whether they can create patients: a signal, as the real permission (read
// from the store context) is.
const [canMutatePatients, setCanMutatePatients] = createSignal(true);
vi.mock('../../store/storeContext', () => ({
  hasPermission: (permission: string) =>
    permission === 'PRESCRIPTION_QUERY'
      ? canReadDispensing
      : permission === 'PATIENT_MUTATE'
        ? canMutatePatients()
        : true,
}));

const linkPatientToStore = vi.fn();
vi.mock('./patientResource', () => ({
  linkPatientToStore: (...args: unknown[]) => linkPatientToStore(...args),
}));

const findPatients = vi.fn();
const findCentralPatients = vi.fn();
const recentPatients = vi.fn();
vi.mock('./patientFind', async importOriginal => ({
  ...(await importOriginal<typeof import('./patientFind')>()),
  findPatients: (...args: unknown[]) => findPatients(...args),
  findCentralPatients: (...args: unknown[]) => findCentralPatients(...args),
  recentPatients: (...args: unknown[]) => recentPatients(...args),
}));

import {
  PatientSearchDialog,
  type PatientSearchDialogProps,
} from './PatientSearchDialog';
import type {
  CentralFind,
  FindResult,
  FindTerms,
  PatientFindRow,
} from './patientFind';

let dispose: (() => void) | undefined;
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('document', {
    createElement: () => ({
      innerHTML: '',
      content: { firstChild: new FakeNode() },
    }),
  });
  recentPatients.mockResolvedValue([]);
});
afterEach(() => {
  dispose?.();
  dispose = undefined;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  central = false;
  setCanMutatePatients(true);
  nodes.clear();
  findPatients.mockReset();
  findCentralPatients.mockReset();
  recentPatients.mockReset();
  linkPatientToStore.mockReset();
});

// ---- rows and replies ----

const row = (
  id: string,
  more: Partial<PatientFindRow> = {}
): PatientFindRow => ({
  id,
  code: id.toUpperCase(),
  code2: null,
  name: `Smith, ${id}`,
  firstName: id,
  lastName: 'Smith',
  gender: null,
  dateOfBirth: null,
  isDeceased: false,
  address1: null,
  phone: null,
  ...more,
});
const here = (rows: PatientFindRow[]): FindResult => ({ rows, more: false });
const ok = (rows: PatientFindRow[]): CentralFind => ({
  kind: 'ok',
  rows,
  more: false,
});
const deferred = <T,>() => {
  let resolveIt!: (value: T) => void;
  const promise = new Promise<T>(r => (resolveIt = r));
  return { promise, resolve: resolveIt };
};

// ---- driving the dialog ----

const mount = (
  props: Partial<PatientSearchDialogProps> = {},
  options: { canCreate?: boolean } = {}
) => {
  const onChoose = vi.fn<PatientSearchDialogProps['onChoose']>();
  const onCreatePatient =
    vi.fn<NonNullable<PatientSearchDialogProps['onCreatePatient']>>();
  const [open, setOpen] = createSignal(true);
  createRoot(d => {
    dispose = d;
    return (
      <PatientSearchDialog
        open={open()}
        storeId="store"
        title="Find patient"
        onClose={() => {}}
        onChoose={onChoose}
        onCreatePatient={
          options.canCreate === false ? undefined : onCreatePatient
        }
        {...props}
      />
    );
  });
  return { onChoose, onCreatePatient, setOpen };
};

const TESTIDS = {
  firstName: 'patient-search-first-name',
  lastName: 'patient-search-last-name',
  dateOfBirth: 'patient-search-date-of-birth',
  id: 'patient-search-code',
} as const;
type Field = keyof typeof TESTIDS;

const field = (name: Field) => {
  const found = [...rendered.fields].find(
    p => p['data-testid'] === TESTIDS[name]
  );
  if (!found) throw new Error(`no ${name} field`);
  return found as {
    onInput: (e: { currentTarget: { value: string } }) => void;
    onKeyDown: (e: { key: string; preventDefault: () => void }) => void;
  };
};
const type = (name: Field, value: string) =>
  field(name).onInput({ currentTarget: { value } });
const pressEnter = (name: Field = 'lastName') =>
  field(name).onKeyDown({ key: 'Enter', preventDefault: () => {} });

/** Let the replies already settled run their continuations. */
const settle = () => vi.advanceTimersByTimeAsync(0);
/** Wait out the typing pause, and let the search's replies land. */
const pause = () => vi.advanceTimersByTimeAsync(400);

const textOf = (value: unknown): unknown =>
  typeof value === 'function' ? textOf((value as () => unknown)()) : value;
const button = (testId: string) =>
  [...rendered.buttons].find(p => p['data-testid'] === testId) as
    { onClick: () => void; disabled?: boolean } | undefined;
const buttonLabelled = (label: string) =>
  [...rendered.buttons].find(p => textOf(p.children) === label) as
    { onClick: () => void } | undefined;

const tables = () => [...rendered.tables];
const localTable = () => tables().find(t => 'empty' in t.props);
const centralTable = () =>
  tables().find(t => 'pagination' in t.props && !('empty' in t.props));
const recentTable = () => tables().find(t => !('pagination' in t.props));
const localRows = () =>
  (localTable()?.props.rows as PatientFindRow[] | undefined)?.map(r => r.id);
const centralRows = () =>
  (centralTable()?.props.rows as PatientFindRow[] | undefined)?.map(r => r.id);
const otherFacilitiesShown = () =>
  [...rendered.stacks].some(
    p => p['data-testid'] === 'other-facilities-results'
  );
const centralWarning = () =>
  [...rendered.alerts].some(p => p.testId === 'central-search-error');

// ---- the tests ----

describe('OMS-REG-DIS-01.56 — the search runs once typing pauses, or on Enter', () => {
  it('lists nothing and asks nothing until a field is filled in', async () => {
    mount();
    await pause();
    expect(findPatients).not.toHaveBeenCalled();
    expect(localTable()).toBeUndefined();
  });

  it('searches once, 400ms after the last keystroke', async () => {
    findPatients.mockResolvedValue(here([row('a')]));
    mount();
    type('lastName', 'S');
    await vi.advanceTimersByTimeAsync(300);
    type('lastName', 'Sm');
    await vi.advanceTimersByTimeAsync(399);
    expect(findPatients).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(findPatients).toHaveBeenCalledOnce();
    expect(findPatients.mock.calls[0]).toEqual([
      'store',
      { lastName: 'Sm', firstName: '', dob: undefined, id: '' },
    ]);
    await settle();
    expect(localRows()).toEqual(['a']);
  });

  it('searches straight away on Enter, and not again when the pause would end', async () => {
    findPatients.mockResolvedValue(here([row('a')]));
    mount();
    type('lastName', 'Smith');
    pressEnter();
    expect(findPatients).toHaveBeenCalledOnce();
    await pause();
    expect(findPatients).toHaveBeenCalledOnce();
  });

  it('searches a year typed as a date of birth as the whole year (.55)', async () => {
    findPatients.mockResolvedValue(here([row('a')]));
    mount();
    type('dateOfBirth', '1984');
    await pause();
    expect((findPatients.mock.calls[0][1] as FindTerms).dob).toEqual({
      from: '1984-01-01',
      to: '1984-12-31',
      exact: false,
    });
  });

  it('shows only the latest search’s results when an older one answers late', async () => {
    const older = deferred<FindResult>();
    findPatients
      .mockReturnValueOnce(older.promise)
      .mockResolvedValueOnce(here([row('new')]));
    mount();
    type('lastName', 'Sm');
    await pause();
    type('lastName', 'Smith');
    await pause();
    older.resolve(here([row('old')]));
    await settle();
    expect(localRows()).toEqual(['new']);
  });
});

describe('OMS-REG-DIS-01.73 — Enter on an exact patient ID chooses that patient', () => {
  it('chooses the one living patient whose code is the ID typed', async () => {
    const card = row('ab12');
    findPatients.mockResolvedValue(here([card, row('ab123')]));
    const { onChoose } = mount();
    type('id', 'ab12');
    pressEnter('id');
    await settle();
    expect(onChoose).toHaveBeenCalledWith(card);
  });

  it('chooses on an exact National ID (code2) too', async () => {
    const card = row('p1', { code2: 'N-77' });
    findPatients.mockResolvedValue(here([card]));
    const { onChoose } = mount();
    type('id', 'n-77');
    pressEnter('id');
    await settle();
    expect(onChoose).toHaveBeenCalledWith(card);
  });

  it('chooses no one when two patients have that ID', async () => {
    findPatients.mockResolvedValue(
      here([row('ab12'), row('p2', { code2: 'AB12' })])
    );
    const { onChoose } = mount();
    type('id', 'AB12');
    pressEnter('id');
    await settle();
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('chooses no one when the only match is deceased', async () => {
    findPatients.mockResolvedValue(here([row('ab12', { isDeceased: true })]));
    const { onChoose } = mount();
    type('id', 'AB12');
    pressEnter('id');
    await settle();
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('chooses no one when the search ran on a pause, not Enter', async () => {
    findPatients.mockResolvedValue(here([row('ab12')]));
    const { onChoose } = mount();
    type('id', 'AB12');
    await pause();
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('shows the message the caller returns in the dialog', async () => {
    findPatients.mockResolvedValue(here([row('ab12')]));
    const { onChoose } = mount();
    onChoose.mockResolvedValue('Not allowed');
    type('id', 'AB12');
    pressEnter('id');
    await settle();
    expect(
      [...rendered.alerts].some(a => textOf(a.children) === 'Not allowed')
    ).toBe(true);
  });
});

describe('OMS-REG-DIS-01.57 — when other facilities are searched', () => {
  it('searches them automatically when nothing matches here', async () => {
    findPatients.mockResolvedValue(here([]));
    findCentralPatients.mockResolvedValue(ok([row('c1')]));
    mount();
    type('lastName', 'Smith');
    await pause();
    expect(findCentralPatients).toHaveBeenCalledOnce();
    expect(findCentralPatients.mock.calls[0][1]).toMatchObject({
      lastName: 'Smith',
    });
    expect(otherFacilitiesShown()).toBe(true);
    expect(centralRows()).toEqual(['c1']);
  });

  it('offers them, rather than searching, when there are matches here', async () => {
    findPatients.mockResolvedValue(here([row('a')]));
    findCentralPatients.mockResolvedValue(ok([row('c1')]));
    mount();
    type('lastName', 'Smith');
    await pause();
    expect(findCentralPatients).not.toHaveBeenCalled();
    expect(otherFacilitiesShown()).toBe(false);
    const offer = button('search-other-facilities-button');
    expect(offer).toBeDefined();
    offer?.onClick();
    await settle();
    expect(findCentralPatients).toHaveBeenCalledOnce();
    expect(otherFacilitiesShown()).toBe(true);
    // The offer goes once they have been asked.
    expect(button('search-other-facilities-button')).toBeUndefined();
  });

  it('lists a patient from another facility only once, under this store', async () => {
    findPatients.mockResolvedValue(here([row('a')]));
    findCentralPatients.mockResolvedValue(ok([row('a'), row('c1')]));
    mount();
    type('lastName', 'Smith');
    await pause();
    button('search-other-facilities-button')?.onClick();
    await settle();
    expect(centralRows()).toEqual(['c1']);
  });

  it('neither searches nor offers them on the central server', async () => {
    central = true;
    findPatients.mockResolvedValueOnce(here([]));
    mount();
    type('lastName', 'Nobody');
    await pause();
    expect(findCentralPatients).not.toHaveBeenCalled();
    expect(otherFacilitiesShown()).toBe(false);

    findPatients.mockResolvedValueOnce(here([row('a')]));
    type('lastName', 'Smith');
    await pause();
    expect(localRows()).toEqual(['a']);
    expect(button('search-other-facilities-button')).toBeUndefined();
  });
});

describe('OMS-REG-DIS-01.58 — other facilities out of reach', () => {
  it('warns with Retry, and keeps this store’s results usable', async () => {
    findPatients.mockResolvedValue(here([]));
    findCentralPatients.mockResolvedValue({ kind: 'unreachable' });
    mount();
    type('lastName', 'Smith');
    await pause();
    expect(centralWarning()).toBe(true);
    expect(texts()).toContain('messages.failed-to-reach-central');
    const retry = buttonLabelled('button.retry');
    expect(retry).toBeDefined();
    findCentralPatients.mockResolvedValue(ok([row('c1')]));
    retry?.onClick();
    await settle();
    expect(findCentralPatients).toHaveBeenCalledTimes(2);
    expect(centralWarning()).toBe(false);
    expect(centralRows()).toEqual(['c1']);
  });

  it('says when central was reached but too slow to answer, and pauses it the same', async () => {
    findPatients.mockResolvedValue(here([]));
    findCentralPatients.mockResolvedValue({ kind: 'slow' });
    mount();
    type('lastName', 'Smith');
    await pause();
    expect(centralWarning()).toBe(true);
    expect(texts()).toContain('messages.central-slow');
    expect(texts()).not.toContain('messages.failed-to-reach-central');
    expect(buttonLabelled('button.retry')).toBeDefined();

    await vi.advanceTimersByTimeAsync(30_000);
    type('lastName', 'Smyth');
    await pause();
    expect(findCentralPatients).toHaveBeenCalledOnce();
    expect(texts()).toContain('messages.other-facilities-skipped-slow');
  });

  it('skips asking again within a minute, saying so with a Search other facilities button (.70)', async () => {
    findPatients.mockResolvedValue(here([]));
    findCentralPatients.mockResolvedValue({ kind: 'unreachable' });
    mount();
    type('lastName', 'Smith');
    await pause();
    expect(findCentralPatients).toHaveBeenCalledOnce();

    await vi.advanceTimersByTimeAsync(30_000);
    type('lastName', 'Smyth');
    await pause();
    expect(findCentralPatients).toHaveBeenCalledOnce();
    expect(centralWarning()).toBe(true);
    expect(texts()).toContain('messages.other-facilities-skipped');
    const ask = buttonLabelled('button.search-other-facilities');
    expect(ask).toBeDefined();

    // The button still asks.
    findCentralPatients.mockResolvedValue(ok([]));
    ask?.onClick();
    await settle();
    expect(findCentralPatients).toHaveBeenCalledTimes(2);
    expect((findCentralPatients.mock.calls[1][1] as FindTerms).lastName).toBe(
      'Smyth'
    );
  });

  it('asks by itself again once the minute is up (.70)', async () => {
    findPatients.mockResolvedValue(here([]));
    findCentralPatients.mockResolvedValue({ kind: 'unreachable' });
    mount();
    type('lastName', 'Smith');
    await pause();
    await vi.advanceTimersByTimeAsync(60_000);
    type('lastName', 'Smyth');
    await pause();
    expect(findCentralPatients).toHaveBeenCalledTimes(2);
  });

  it('forgets an earlier outage when the dialog is opened again (.70)', async () => {
    findPatients.mockResolvedValue(here([]));
    findCentralPatients.mockResolvedValue({ kind: 'unreachable' });
    const { setOpen } = mount();
    type('lastName', 'Smith');
    await pause();
    setOpen(false);
    setOpen(true);
    type('lastName', 'Smyth');
    await pause();
    expect(findCentralPatients).toHaveBeenCalledTimes(2);
  });
});

describe('OMS-REG-DIS-01.69 — the other-facilities results across a new search', () => {
  const searchNoMatchThenType = async () => {
    findPatients.mockResolvedValueOnce(here([]));
    findCentralPatients.mockResolvedValueOnce(ok([row('c1')]));
    const mounted = mount();
    type('lastName', 'Smith');
    await pause();
    expect(otherFacilitiesShown()).toBe(true);
    return mounted;
  };

  it('stays while this store’s new results load, and goes when they have matches', async () => {
    await searchNoMatchThenType();
    const next = deferred<FindResult>();
    findPatients.mockReturnValueOnce(next.promise);
    type('firstName', 'Jo');
    await pause();
    expect(otherFacilitiesShown()).toBe(true);
    expect(centralRows()).toEqual(['c1']);
    next.resolve(here([row('a')]));
    await settle();
    expect(otherFacilitiesShown()).toBe(false);
  });

  it('is searched again when the new search has no matches here either', async () => {
    await searchNoMatchThenType();
    findPatients.mockResolvedValueOnce(here([]));
    findCentralPatients.mockResolvedValueOnce(ok([row('c2')]));
    type('firstName', 'Jo');
    await pause();
    expect(findCentralPatients).toHaveBeenCalledTimes(2);
    expect(centralRows()).toEqual(['c2']);
  });

  it('drops a reply for the old terms that arrives after a new search began', async () => {
    findPatients.mockResolvedValueOnce(here([]));
    const late = deferred<CentralFind>();
    findCentralPatients.mockReturnValueOnce(late.promise);
    mount();
    type('lastName', 'Smith');
    await pause();
    findPatients.mockResolvedValueOnce(here([row('a')]));
    type('firstName', 'Jo');
    await pause();
    late.resolve(ok([row('stale')]));
    await settle();
    expect(otherFacilitiesShown()).toBe(false);
  });

  it('goes when the fields are cleared', async () => {
    await searchNoMatchThenType();
    type('lastName', '');
    await pause();
    expect(otherFacilitiesShown()).toBe(false);
    expect(localTable()).toBeUndefined();
  });
});

describe('OMS-REG-DIS-01.61 — New patient starts the form from the search', () => {
  it('hands on the typed names, trimmed, and a full date of birth', async () => {
    findPatients.mockResolvedValue(here([row('a')]));
    const { onCreatePatient } = mount();
    type('lastName', ' Smith ');
    type('firstName', 'Jo ');
    type('dateOfBirth', '14/03/1984');
    button('create-patient-button')?.onClick();
    expect(onCreatePatient).toHaveBeenCalledWith({
      lastName: 'Smith',
      firstName: 'Jo',
      dateOfBirth: '1984-03-14',
    });
  });

  it('leaves the date of birth out when only a year or month was typed', () => {
    const { onCreatePatient } = mount();
    type('dateOfBirth', '3/1984');
    button('create-patient-button')?.onClick();
    expect(onCreatePatient.mock.calls[0][0].dateOfBirth).toBeNull();
  });

  it('is not offered when the caller gives no create action', () => {
    mount({}, { canCreate: false });
    expect(button('create-patient-button')).toBeUndefined();
  });
});

describe('OMS-REG-DIS-03.84 — New patient without patient-mutate permission', () => {
  const reason = () =>
    [...rendered.tooltips].find(
      p => p.triggerTestId === 'create-patient-disabled-reason'
    );
  // Search for someone who isn't here, so the empty results offer Create a
  // new one.
  const searchNoMatch = async () => {
    findPatients.mockResolvedValue(here([]));
    findCentralPatients.mockResolvedValue(ok([]));
    type('lastName', 'Nobody');
    await pause();
    localTable()?.resolved.empty();
  };

  it('is enabled, with no reason, for a user who may create patients', async () => {
    mount();
    await searchNoMatch();
    expect(button('create-patient-button')?.disabled).toBeFalsy();
    expect(button('nothing-here-create-button')?.disabled).toBeFalsy();
    expect(reason()).toBeUndefined();
  });

  it('stays visible but disabled, with the reason beside it, for a user who may not', async () => {
    setCanMutatePatients(false);
    mount();
    await searchNoMatch();
    expect(button('create-patient-button')?.disabled).toBe(true);
    expect(button('nothing-here-create-button')?.disabled).toBe(true);
    expect(reason()?.text).toBe('messages.create-patient-not-allowed');
  });

  it('follows the permission when it changes on an open search', () => {
    mount();
    expect(button('create-patient-button')?.disabled).toBeFalsy();
    setCanMutatePatients(false);
    expect(button('create-patient-button')?.disabled).toBe(true);
    expect(reason()?.text).toBe('messages.create-patient-not-allowed');
    setCanMutatePatients(true);
    expect(button('create-patient-button')?.disabled).toBeFalsy();
    expect(reason()).toBeUndefined();
  });

  it('still lets a patient be chosen', async () => {
    setCanMutatePatients(false);
    findPatients.mockResolvedValue(here([row('a')]));
    const { onChoose } = mount();
    type('lastName', 'Smith');
    await pause();
    (localTable()?.props.onRowClick as (r: PatientFindRow) => void)(row('a'));
    await settle();
    expect(onChoose).toHaveBeenCalledWith(row('a'));
  });
});

describe('the search — each opening starts blank', () => {
  it('clears the results when opened again', async () => {
    findPatients.mockResolvedValue(here([row('a')]));
    const { setOpen } = mount();
    type('lastName', 'Smith');
    await pause();
    expect(localRows()).toEqual(['a']);
    setOpen(false);
    setOpen(true);
    expect(localTable()).toBeUndefined();
  });

  it('lists this store’s recent patients before anything is typed, when asked (.74)', async () => {
    recentPatients.mockResolvedValue([row('r1')]);
    mount({ showRecent: true });
    await settle();
    expect(recentPatients).toHaveBeenCalledWith('store', 10);
    const recent = recentTable();
    expect((recent?.props.rows as PatientFindRow[]).map(r => r.id)).toEqual([
      'r1',
    ]);
  });

  it('skips recent patients for a user who cannot read dispensing records (.74)', async () => {
    canReadDispensing = false;
    try {
      mount({ showRecent: true });
      await settle();
      expect(recentPatients).not.toHaveBeenCalled();
    } finally {
      canReadDispensing = true;
    }
  });
});

describe('Cancel while a patient is being chosen', () => {
  const findAtOtherFacilities = async () => {
    findPatients.mockResolvedValue(here([]));
    findCentralPatients.mockResolvedValue(ok([row('c1')]));
    const mounted = mount();
    type('lastName', 'Smith');
    await pause();
    return mounted;
  };
  const chooseFromCentral = () =>
    (centralTable()?.props.onRowClick as (r: PatientFindRow) => void)(
      row('c1')
    );

  it('drops the choice when Cancel is pressed while linking', async () => {
    const { onChoose } = await findAtOtherFacilities();
    const link = deferred<{ kind: 'ok' }>();
    linkPatientToStore.mockReturnValue(link.promise);
    chooseFromCentral();
    const cancel = button('dialog-button-cancel');
    expect(cancel?.disabled).toBe(false);
    cancel?.onClick();
    link.resolve({ kind: 'ok' });
    await settle();
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('drops the choice when the dialog is reopened while linking', async () => {
    const { onChoose, setOpen } = await findAtOtherFacilities();
    const link = deferred<{ kind: 'ok' }>();
    linkPatientToStore.mockReturnValue(link.promise);
    chooseFromCentral();
    setOpen(false);
    setOpen(true);
    link.resolve({ kind: 'ok' });
    await settle();
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('chooses once linked when nothing was cancelled', async () => {
    const { onChoose } = await findAtOtherFacilities();
    linkPatientToStore.mockResolvedValue({ kind: 'ok' });
    chooseFromCentral();
    await settle();
    expect(onChoose).toHaveBeenCalledWith(row('c1'));
  });

  it('holds Cancel, and shows the table loading, while the caller acts', async () => {
    findPatients.mockResolvedValue(here([row('a')]));
    const { onChoose } = mount();
    const acting = deferred<undefined>();
    onChoose.mockReturnValue(acting.promise);
    type('lastName', 'Smith');
    await pause();
    (localTable()?.props.onRowClick as (r: PatientFindRow) => void)(row('a'));
    expect(button('dialog-button-cancel')?.disabled).toBe(true);
    expect(localTable()?.props.loading).toBe(true);
    acting.resolve(undefined);
    await settle();
    expect(button('dialog-button-cancel')?.disabled).toBe(false);
    expect(localTable()?.props.loading).toBe(false);
  });

  it('keeps "Getting patient…" up, not this store’s table loading, while the caller acts on a linked patient', async () => {
    const { onChoose } = await findAtOtherFacilities();
    linkPatientToStore.mockResolvedValue({ kind: 'ok' });
    const acting = deferred<undefined>();
    onChoose.mockReturnValue(acting.promise);
    chooseFromCentral();
    await settle();
    const linking = () =>
      [...rendered.alerts].some(a => a.testId === 'patient-search-linking');
    expect(linking()).toBe(true);
    expect(localTable()?.props.loading).toBe(false);
    expect(button('dialog-button-cancel')?.disabled).toBe(true);
    acting.resolve(undefined);
    await settle();
    expect(linking()).toBe(false);
  });

  it('offers Retry and Cancel when linking fails, and Retry links again', async () => {
    const { onChoose } = await findAtOtherFacilities();
    linkPatientToStore.mockResolvedValueOnce({
      kind: 'unreachable',
      message: '',
    });
    chooseFromCentral();
    await settle();
    expect(
      [...rendered.alerts].some(a => a.testId === 'patient-search-link-failed')
    ).toBe(true);
    linkPatientToStore.mockResolvedValueOnce({ kind: 'ok' });
    button('patient-search-link-retry')?.onClick();
    await settle();
    expect(linkPatientToStore).toHaveBeenCalledTimes(2);
    expect(onChoose).toHaveBeenCalledWith(row('c1'));
  });

  it('lets Escape and × abandon a link, as Cancel does, but not the caller’s action', async () => {
    const { onChoose } = await findAtOtherFacilities();
    linkPatientToStore.mockReturnValue(new Promise(() => {}));
    chooseFromCentral();
    expect(dialogProps.dismissable).toBe(true);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('drops an Enter’s exact-ID choice when Cancel is pressed before the search answers', async () => {
    const reply = deferred<FindResult>();
    findPatients.mockReturnValue(reply.promise);
    const { onChoose } = mount();
    type('id', 'AB12');
    pressEnter('id');
    button('dialog-button-cancel')?.onClick();
    reply.resolve(here([row('ab12')]));
    await settle();
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('clears a failed link, and shows the table loading, when someone here is chosen instead', async () => {
    findPatients.mockResolvedValue(here([row('a')]));
    findCentralPatients.mockResolvedValue(ok([row('c1')]));
    const { onChoose } = mount();
    type('lastName', 'Smith');
    await pause();
    button('search-other-facilities-button')?.onClick();
    await settle();
    linkPatientToStore.mockResolvedValue({ kind: 'unreachable', message: '' });
    chooseFromCentral();
    await settle();
    const failed = () =>
      [...rendered.alerts].some(a => a.testId === 'patient-search-link-failed');
    expect(failed()).toBe(true);
    const acting = deferred<undefined>();
    onChoose.mockReturnValue(acting.promise);
    (localTable()?.props.onRowClick as (r: PatientFindRow) => void)(row('a'));
    expect(failed()).toBe(false);
    expect(localTable()?.props.loading).toBe(true);
    acting.resolve(undefined);
    await settle();
  });

  it('returns to the results on the failed link’s Cancel, choosing no one', async () => {
    const { onChoose } = await findAtOtherFacilities();
    linkPatientToStore.mockResolvedValue({ kind: 'unreachable', message: '' });
    chooseFromCentral();
    await settle();
    button('patient-search-link-cancel')?.onClick();
    await settle();
    expect(
      [...rendered.alerts].some(a => a.testId === 'patient-search-link-failed')
    ).toBe(false);
    expect(centralRows()).toEqual(['c1']);
    expect(onChoose).not.toHaveBeenCalled();
  });
});
