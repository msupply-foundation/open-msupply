import { createSignal } from 'solid-js';
import { isCentralServer } from '../../api/serverInfo';
import {
  findCentralPatients,
  findPatients,
  fold,
  namesKey,
  type PatientFindRow,
} from './patientFind';

// The create form's duplicate check (#631 spike; spec/patients S2 › the
// duplicate check): patients whose last and first names start with the
// form's, here and at other facilities. It never blocks the save — the form
// shows it as one line in its footer, with Review for the list.

export type DuplicateTerms = {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
  /** The National ID (code2). */
  nationalId: string;
};

export type LikelyReason = 'birth-year' | 'national-id';

export type DuplicateMatch = PatientFindRow & {
  where: 'here' | 'elsewhere';
  /** Why the match is likely to be this person; empty for a name match. */
  likely: LikelyReason[];
};

// `done` comes as soon as this store answers; other facilities (the central
// server, which can take seconds to answer or fail) follow in `central`.
export type DuplicateState =
  | { status: 'off' }
  | { status: 'checking' }
  | {
      status: 'done';
      matches: DuplicateMatch[];
      central: 'pending' | 'done' | 'failed';
    };

const MIN_LETTERS = 2;

const likelyReasons = (
  row: PatientFindRow,
  terms: DuplicateTerms
): LikelyReason[] => {
  const year = terms.dateOfBirth?.slice(0, 4);
  const id = fold(terms.nationalId);
  return [
    ...(year && row.dateOfBirth?.startsWith(year)
      ? (['birth-year'] as const)
      : []),
    ...(id && row.code2 && fold(row.code2) === id
      ? (['national-id'] as const)
      : []),
  ];
};

export const createDuplicateCheck = (options: {
  storeId: () => string;
  terms: () => DuplicateTerms;
}) => {
  const [state, setState] = createSignal<DuplicateState>({ status: 'off' });
  // What was last checked: the names without case or accents, the birth year
  // and the National ID. Leaving a field re-checks only when one changed.
  let lastKey = '';
  let token = 0;

  const run = async (force = false) => {
    const terms = options.terms();
    if (
      fold(terms.firstName).length < MIN_LETTERS ||
      fold(terms.lastName).length < MIN_LETTERS
    ) {
      lastKey = '';
      token++;
      setState({ status: 'off' });
      return;
    }
    const names = namesKey(terms.firstName, terms.lastName);
    const key = [
      names,
      terms.dateOfBirth?.slice(0, 4) ?? '',
      fold(terms.nationalId),
    ].join('|');
    if (key === lastKey && !force) return;
    lastKey = key;
    const mine = ++token;
    setState({ status: 'checking' });

    const nameTerms = {
      lastName: terms.lastName,
      firstName: terms.firstName,
      id: '',
    };
    const centralRequest = isCentralServer()
      ? undefined
      : findCentralPatients(options.storeId(), nameTerms);

    const local = await findPatients(options.storeId(), nameTerms);
    if (mine !== token) return;
    const here = (local?.rows ?? []).map((row): DuplicateMatch => ({
      ...row,
      where: 'here',
      likely: likelyReasons(row, terms),
    }));

    const show = (
      centralRows: PatientFindRow[],
      central: 'pending' | 'done' | 'failed'
    ) => {
      const hereIds = new Set(here.map(m => m.id));
      const elsewhere = centralRows
        .filter(row => !hereIds.has(row.id))
        .map((row): DuplicateMatch => ({
          ...row,
          where: 'elsewhere',
          likely: likelyReasons(row, terms),
        }));
      // Likely matches first, keeping name order within each group.
      const matches = [...here, ...elsewhere].sort(
        (a, b) => b.likely.length - a.likely.length
      );
      setState({ status: 'done', matches, central });
    };

    if (!centralRequest) return show([], 'done');
    show([], 'pending');
    const central = await centralRequest;
    if (mine !== token) return;
    // Anything but an answer means other facilities weren't checked, so it
    // never reads as "no existing patients".
    if (central.kind === 'ok') show(central.rows, 'done');
    else show([], 'failed');
  };

  const reset = () => {
    lastKey = '';
    token++;
    setState({ status: 'off' });
  };

  return { state, run, retry: () => run(true), reset };
};
