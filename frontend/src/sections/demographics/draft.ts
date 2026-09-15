import type {
  DemographicIndicatorsResult,
  DemographicProjectionByBaseYearResult,
  InsertDemographicIndicatorVariables,
  InsertDemographicProjectionVariables,
  UpdateDemographicIndicatorVariables,
  UpdateDemographicProjectionVariables,
} from './demographics.generated';

// The draft model and the calculation (spec/demographics rules § the
// calculation, § the grid, § editing the draft, § saving the draft). Pure and
// node-testable: no SolidJS, no i18n, no DOM — the editor owns the reactive
// store, the page owns rendering, this owns the rules.
//
// Types come from codegen, never remapped (kdd/type-safety): a draft row IS
// the wire node plus one flag.

/** One indicator as the read returns it. */
export type Indicator =
  DemographicIndicatorsResult['demographicIndicators']['nodes'][number];

/** The stored growth-rate record, when the base year has one. */
export type ProjectionNode = Extract<
  DemographicProjectionByBaseYearResult['demographicProjectionByBaseYear'],
  { __typename: 'DemographicProjectionNode' }
>;

/** The five header percentages — growth on the previous year for years 1–5. */
export type GrowthRates = Pick<
  ProjectionNode,
  'year1' | 'year2' | 'year3' | 'year4' | 'year5'
>;

/**
 * A grid row: the wire node plus whether it was born on this screen and is
 * still unsaved — which decides insert vs update on Save, and whether Cancel
 * drops it.
 */
export type DraftIndicator = Indicator & { isNew: boolean };

export type Draft = {
  /** Every row, the general population row first (rules § the grid). */
  indicators: DraftIndicator[];
  rates: GrowthRates;
  /**
   * The stored growth-rate record's id — undefined when the base year has
   * none yet, in which case the first Save creates it (rules § growth rates).
   */
  projectionId: string | undefined;
  /**
   * The base year a NEW row is born with: that of the first indicator in the
   * read's name order — not necessarily the general population row (rules §
   * indicators, captured as-is).
   */
  newRowBaseYear: number;
};

/**
 * The fixed identity of the general population indicator, installed by the
 * server's reference migration on every installation (contract § the general
 * population row). The client keys its special treatment on this id.
 */
export const GENERAL_ROW_ID = 'generalRow';

/** The one base year the screen works in; not shown, not changeable. */
export const BASE_YEAR = 2024;

export const YEARS = [1, 2, 3, 4, 5] as const;
export type Year = (typeof YEARS)[number];

export const rateKey = (year: Year): keyof GrowthRates => `year${year}`;

export const ZERO_RATES: GrowthRates = {
  year1: 0,
  year2: 0,
  year3: 0,
  year4: 0,
  year5: 0,
};

// Always a FRESH rates object — never the ZERO_RATES constant itself. The
// draft lives in a Solid store, and a store writes through to the object it
// was given: seeding the constant and then editing a rate would silently
// mutate ZERO_RATES, so the next seed (a Cancel, a reload with no record)
// would "restore" the edited figures. Caught by the deterministic suite on
// the reference datafile, which has no growth-rate record.
export const emptyDraft = (): Draft => ({
  indicators: [],
  rates: { ...ZERO_RATES },
  projectionId: undefined,
  newRowBaseYear: BASE_YEAR,
});

export const isGeneralRow = (row: { id: string }): boolean =>
  row.id === GENERAL_ROW_ID;

// To the nearest whole person, and never the -0 a negative share can leave
// behind (rules § the calculation; the reference client's NumUtils.round).
const wholePersons = (value: number): number => {
  const rounded = Math.round(value);
  return rounded === 0 ? 0 : rounded;
};

/**
 * Year 0 of a row (rules § the calculation): the baseline scaled by the row's
 * share. The general population row's share is 100, so its current population
 * is the baseline itself.
 */
export const currentPopulation = (baseline: number, share: number): number =>
  wholePersons((baseline * share) / 100);

/**
 * Years 1–5 of a row (rules § the calculation): each year compounds on the
 * PREVIOUS year's whole-person figure, so 1 000 at 10 % every year projects
 * 1 100 · 1 210 · 1 331 · 1 464 · 1 610 — not 1 611.
 */
export const projectYears = (
  current: number,
  rates: GrowthRates
): [number, number, number, number, number] => {
  const years: number[] = [];
  let previous = current;
  for (const year of YEARS) {
    previous = wholePersons(previous * (1 + rates[rateKey(year)] / 100));
    years.push(previous);
  }
  return years as [number, number, number, number, number];
};

/** The baseline: the general population row's current population. */
export const baselineOf = (
  indicators: readonly { id: string; basePopulation: number }[]
): number => indicators.find(isGeneralRow)?.basePopulation ?? 0;

/**
 * The rows in grid order (rules § the grid): the general population row pinned
 * first, the rest exactly as the read returned them — already `name`
 * ascending, case-insensitive, by the read's default sort (contract §
 * indicators). Nothing is re-sorted here: the server's collation is the
 * order, this only pins.
 */
export const pinGeneralFirst = <T extends { id: string }>(
  nodes: readonly T[]
): T[] => [
  ...nodes.filter(isGeneralRow),
  ...nodes.filter(node => !isGeneralRow(node)),
];

/**
 * The rates a stored record carries, or zero everywhere when there is none —
 * a fresh object either way (see emptyDraft: the store writes through).
 */
export const ratesOf = (projection: ProjectionNode | undefined): GrowthRates =>
  projection
    ? {
        year1: projection.year1,
        year2: projection.year2,
        year3: projection.year3,
        year4: projection.year4,
        year5: projection.year5,
      }
    : { ...ZERO_RATES };

/**
 * Seed a draft from what the server answered (rules § editing the draft):
 * every loaded row clean, the rates as stored (or zero), and the base year new
 * rows will take. Cancel and a post-save reload both come back through here.
 */
export const toDraft = (
  indicators: readonly Indicator[],
  projection: ProjectionNode | undefined
): Draft => ({
  indicators: pinGeneralFirst(indicators).map(node => ({
    ...node,
    isNew: false,
  })),
  rates: ratesOf(projection),
  projectionId: projection?.id,
  newRowBaseYear: indicators[0]?.baseYear ?? BASE_YEAR,
});

/**
 * A blank row for New indicator (rules § editing the draft): blank name, 0 %
 * share, figures computed as zero — and the draft's base year for new rows.
 * The stored projection fields are zero placeholders; the grid never reads
 * them (every figure is derived), and Save overwrites them.
 */
export const newIndicator = (id: string, baseYear: number): DraftIndicator => ({
  id,
  name: '',
  baseYear,
  basePopulation: 0,
  populationPercentage: 0,
  year1Projection: 0,
  year2Projection: 0,
  year3Projection: 0,
  year4Projection: 0,
  year5Projection: 0,
  isNew: true,
});

export const isBlankName = (name: string): boolean => name.trim() === '';

type IndicatorInsertInput = InsertDemographicIndicatorVariables['input'];
type IndicatorUpdateInput = UpdateDemographicIndicatorVariables['input'];
type ProjectionInsertInput = InsertDemographicProjectionVariables['input'];
type ProjectionUpdateInput = UpdateDemographicProjectionVariables['input'];

// The figures every row is written with (rules § saving the draft): the
// baseline as its base population and its five recomputed projections.
const savedFigures = (
  row: DraftIndicator,
  baseline: number,
  rates: GrowthRates
) => {
  const [year1, year2, year3, year4, year5] = projectYears(
    currentPopulation(baseline, row.populationPercentage),
    rates
  );
  return {
    basePopulation: baseline,
    populationPercentage: row.populationPercentage,
    year1Projection: year1,
    year2Projection: year2,
    year3Projection: year3,
    year4Projection: year4,
    year5Projection: year5,
  };
};

/**
 * A new row's create input (contract § indicators). The name is OMITTED when
 * blank, never sent as "": the server's no-name check fires only on an ABSENT
 * name (`name: ""` passes it and creates an indicator and a group both named
 * ""), so omit-when-blank is what reaches the _no name_ rejection.
 */
export const toInsertInput = (
  row: DraftIndicator,
  baseline: number,
  rates: GrowthRates
): IndicatorInsertInput => ({
  id: row.id,
  ...(isBlankName(row.name) ? {} : { name: row.name }),
  baseYear: row.baseYear,
  ...savedFigures(row, baseline, rates),
});

/**
 * An existing row's update input (contract § indicators): the full field set,
 * every save — the wire is partial, but the rules say every row is written in
 * full. `name` is the row's own; the general population row's is substituted
 * by the caller (saveInputs) with the screen's translated label.
 */
export const toUpdateInput = (
  row: DraftIndicator,
  baseline: number,
  rates: GrowthRates
): IndicatorUpdateInput => ({
  id: row.id,
  name: row.name,
  baseYear: row.baseYear,
  ...savedFigures(row, baseline, rates),
});

export type ProjectionWrite =
  | { kind: 'insert'; input: ProjectionInsertInput }
  | { kind: 'update'; input: ProjectionUpdateInput };

/**
 * The growth-rate write (contract § growth rates): an update of the stored
 * record, or — when the base year has none — a create with a fresh client id.
 * Always all five rates plus the base year.
 */
export const projectionWrite = (
  draft: Draft,
  newId: () => string
): ProjectionWrite =>
  draft.projectionId === undefined
    ? {
        kind: 'insert',
        input: { id: newId(), baseYear: BASE_YEAR, ...draft.rates },
      }
    : {
        kind: 'update',
        input: { id: draft.projectionId, baseYear: BASE_YEAR, ...draft.rates },
      };

export type SaveInputs = {
  updates: IndicatorUpdateInput[];
  inserts: IndicatorInsertInput[];
  projection: ProjectionWrite;
};

/**
 * Everything one Save sends (rules § saving the draft): every existing row as
 * an update, every new row as an insert, then the growth rates.
 *
 * `generalPopulationName` is the screen's own translated label for the general
 * population row, sent back as that row's stored name — so after a save in any
 * language the stored name, and the demographic group vaccine courses see, is
 * that language's label (rules § the general population row, captured as-is).
 */
export const saveInputs = (
  draft: Draft,
  generalPopulationName: string,
  newId: () => string
): SaveInputs => {
  const baseline = baselineOf(draft.indicators);
  const named = (row: DraftIndicator): DraftIndicator =>
    isGeneralRow(row) ? { ...row, name: generalPopulationName } : row;
  return {
    updates: draft.indicators
      .filter(row => !row.isNew)
      .map(row => toUpdateInput(named(row), baseline, draft.rates)),
    inserts: draft.indicators
      .filter(row => row.isNew)
      .map(row => toInsertInput(row, baseline, draft.rates)),
    projection: projectionWrite(draft, newId),
  };
};
