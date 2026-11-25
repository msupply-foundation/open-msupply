import { createSignal } from 'solid-js';
import {
  findOtherFacilityPatients,
  findPatients,
  fold,
  namesKey,
  type FindResult,
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
  /** The secondary code, shown as Code 2. */
  code2: string;
};

export type LikelyReason = 'birth-year' | 'code2';

export type DuplicateMatch = PatientFindRow & {
  where: 'here' | 'elsewhere';
  /** Why the match is likely to be this person; empty for a name match. */
  likely: LikelyReason[];
};

// `done` comes as soon as this store answers; other facilities (the central
// server, which can take seconds to answer or fail) follow in `central`.
// `more`: there are more matches than were fetched. `failed`: this store
// didn't answer, so nothing is known — it never reads as none found.
export type DuplicateState =
  | { status: 'off' }
  | { status: 'checking' }
  | { status: 'failed' }
  | {
      status: 'done';
      matches: DuplicateMatch[];
      more: boolean;
      central: 'pending' | 'done' | 'failed';
    };

const MIN_LETTERS = 2;

const likelyReasons = (
  row: PatientFindRow,
  terms: DuplicateTerms
): LikelyReason[] => {
  const year = terms.dateOfBirth?.slice(0, 4);
  const id = fold(terms.code2);
  return [
    ...(year && row.dateOfBirth?.startsWith(year)
      ? (['birth-year'] as const)
      : []),
    ...(id && row.code2 && fold(row.code2) === id ? (['code2'] as const) : []),
  ];
};

export const createDuplicateCheck = (options: {
  storeId: () => string;
  terms: () => DuplicateTerms;
}) => {
  const [state, setState] = createSignal<DuplicateState>({ status: 'off' });
  // What was last checked: the names without case or accents, the birth year
  // and Code 2. Leaving a field re-checks only when one changed.
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
      fold(terms.code2),
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
    // This site's own patients at other stores come first, while central is
    // still being asked; they show once this store's matches are in.
    let siteFirst: FindResult | undefined;
    let showSiteFirst: (() => void) | undefined;
    const centralRequest = findOtherFacilityPatients(
      options.storeId(),
      nameTerms,
      {
        onSite: site => {
          if (mine !== token) return;
          siteFirst = site;
          showSiteFirst?.();
        },
      }
    );

    const local = await findPatients(options.storeId(), nameTerms);
    if (mine !== token) return;
    if (!local) return setState({ status: 'failed' });
    const here = local.rows.map((row): DuplicateMatch => ({
      ...row,
      where: 'here',
      likely: likelyReasons(row, terms),
    }));

    const show = (
      centralRows: PatientFindRow[],
      central: 'pending' | 'done' | 'failed',
      centralMore = false
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
      setState({
        status: 'done',
        matches,
        more: local.more || centralMore,
        central,
      });
    };

    showSiteFirst = () =>
      show(siteFirst?.rows ?? [], 'pending', siteFirst?.more ?? false);
    showSiteFirst();
    const central = await centralRequest;
    showSiteFirst = undefined;
    if (mine !== token) return;
    // Anything but an answer means other facilities weren't checked, so it
    // never reads as "no existing patients".
    if (central.kind === 'ok') show(central.rows, 'done', central.more);
    // Failed outright: what this site had already found still counts
    else if (central.kind === 'failed')
      show(siteFirst?.rows ?? [], 'failed', siteFirst?.more ?? false);
    // Central's are missing, but this site's own at other stores still count
    else show(central.site?.rows ?? [], 'failed', central.site?.more ?? false);
  };

  const reset = () => {
    lastKey = '';
    token++;
    setState({ status: 'off' });
  };

  return { state, run, retry: () => run(true), reset };
};
