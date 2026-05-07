import React from 'react';
import {
  Alert,
  Box,
  Typography,
  TypedTFunction,
  LocaleKey,
  useTranslation,
  useFormatNumber,
  useIntlUtils,
} from '@openmsupply-client/common';

interface PopulationCourseData {
  courseTitle: string;
  numberOfDoses: number;
  coverageRate: number;
  targetPopulation: number;
  lossFactor: number;
  annualTargetDoses: number;
  bufferStockMonths: number;
  supplyPeriodMonths: number;
  dosesPerUnit: number;
  forecastDoses: number;
  forecastUnits: number;
  forecastMonthlyUsage: number;
}

interface DefaultAmcSnapshotBreakdown {
  source: 'default';
  lookbackMonths: number;
  totalConsumption: number;
  numberOfDays: number;
  daysOutOfStock?: number | null;
  dosAdjustmentFactor: number;
}

interface PluginAmcSnapshotBreakdown {
  source: 'plugin';
  code: string;
}

type AmcSnapshotBreakdown =
  | DefaultAmcSnapshotBreakdown
  | PluginAmcSnapshotBreakdown;

interface AmcSnapshot {
  forecastMonthlyUsage: number;
  breakdown: AmcSnapshotBreakdown;
}

interface PopulationSnapshot {
  forecastMonthlyUsage: number;
  forecastTotalDoses: number;
  vaccineCourses: PopulationCourseData[];
}

interface AncillaryContribution {
  parentLineId: string;
  parentItemId: string;
  parentItemName: string;
  parentForecastMonthlyUsage: number;
  itemQuantity: number;
  ancillaryQuantity: number;
  monthlyUsage: number;
}

interface AncillaryRatioSnapshot {
  forecastMonthlyUsage: number;
  contributions: AncillaryContribution[];
}

interface DisplayRow {
  label: string;
  formula?: string | null;
  substitution?: string | null;
  result: string;
}

interface PluginSnapshot {
  pluginCode: string;
  pluginVersion: string;
  forecastMonthlyUsage: number;
  forecastDoses?: number | null;
  display: DisplayRow[];
}

// --- Per-method error spaces (closed unions) -------------------------------

type AmcError = {
  kind: 'noConsumptionHistory';
  lookbackMonths: number;
};

type MissingStoreField = 'populationServed' | 'supplyInterval';

type PopulationError =
  | {
      kind: 'missingStoreConfig';
      storeId: string;
      missingFields: MissingStoreField[];
    }
  | { kind: 'noVaccineCourseForItem'; itemId: string };

type AncillaryRatioError = {
  kind: 'noParentsInRequisition';
  itemId: string;
};

type PluginError_ =
  | { kind: 'notFound'; pluginCode: string }
  | {
      kind: 'invocationFailed';
      pluginCode: string;
      pluginVersion: string;
      message: string;
    };

// Server-side serde flattens variant data alongside the `method`/`status` tags,
// so each branch's fields sit at the top level. Each method has its own closed
// error space — TS narrowing forces every render site to handle them.
type ForecastSnapshot =
  | ({ method: 'amc'; status: 'ok' } & AmcSnapshot)
  | ({ method: 'amc'; status: 'error' } & AmcError)
  | ({ method: 'population'; status: 'ok' } & PopulationSnapshot)
  | ({ method: 'population'; status: 'error' } & PopulationError)
  | ({ method: 'ancillary_ratio'; status: 'ok' } & AncillaryRatioSnapshot)
  | ({ method: 'ancillary_ratio'; status: 'error' } & AncillaryRatioError)
  | ({ method: 'plugin'; status: 'ok' } & PluginSnapshot)
  | ({ method: 'plugin'; status: 'error' } & PluginError_);

/// True for any Error outcome. Used by the detail-view column to dim the
/// monthly-usage cell to "—" without re-parsing.
export const isForecastSnapshotError = (forecastData?: string | null): boolean => {
  if (!forecastData) return false;
  try {
    const snap = JSON.parse(forecastData) as { status?: string };
    return snap.status === 'error';
  } catch {
    return false;
  }
};

interface EquationLine {
  /// Left-hand label, only shown on the first row (subsequent rows align
  /// under the `=` sign with no label).
  label?: string;
  rhs: React.ReactNode;
  /// Optional unit suffix dimmed next to the value (e.g. "vials", "doses").
  suffix?: string;
}

/// One section of the breakdown. With a `title` it renders as an accordion
/// (e.g. one per vaccine course / per ancillary parent); without, it's
/// rendered flat.
interface EquationGroup {
  title?: string;
  /// Each inner array is one equation block (formula / substitution / result
  /// rows that share a single `=` column).
  equations: EquationLine[][];
}

/// Single renderer that every method funnels into. The per-method adapters
/// below shape their snapshot into `EquationDisplayProps`.
interface EquationDisplayProps {
  heading: string;
  warning?: string;
  groups: EquationGroup[];
}

/// Three-column grid: `label = rhs (suffix)`. Subsequent rows omit the label
/// so all `=` and rhs values stack vertically aligned.
const EquationBlock = ({ rows }: { rows: EquationLine[] }) => (
  <Box
    sx={{
      display: 'grid',
      gridTemplateColumns: 'auto auto 1fr',
      columnGap: 1,
      rowGap: 0.5,
      fontFamily: 'monospace',
      fontSize: 14,
      mt: 1,
      ml: 1,
      alignItems: 'baseline',
    }}
  >
    {rows.map((row, i) => (
      <React.Fragment key={i}>
        <Box sx={{ fontWeight: i === 0 ? 700 : 400 }}>{row.label ?? ''}</Box>
        <Box>=</Box>
        <Box>
          {row.rhs}
          {row.suffix && (
            <Box
              component="span"
              sx={{ color: 'text.secondary', ml: 1, fontSize: 12 }}
            >
              {row.suffix}
            </Box>
          )}
        </Box>
      </React.Fragment>
    ))}
  </Box>
);

/// Renders the breakdown as a single card with stacked groups — no
/// accordions, no expand/collapse. Each group has an optional small
/// uppercased subtitle (e.g. one per vaccine course / per ancillary
/// parent), and its equation blocks are visible inline.
const EquationDisplay = ({
  heading,
  warning,
  groups,
}: EquationDisplayProps) => (
  <Box
    sx={{
      width: '100%',
      maxWidth: 900,
      mx: 'auto',
      p: 3,
      borderRadius: 2,
      backgroundColor: 'background.menu',
    }}
  >
    <Typography variant="body1" fontWeight={700} sx={{ mb: 1 }}>
      {heading}
    </Typography>
    {warning && (
      <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
        {warning}
      </Typography>
    )}
    {groups.map((group, gi) => (
      <Box key={gi} sx={{ mt: gi === 0 ? 1 : 3 }}>
        {group.title && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              textTransform: 'uppercase',
              fontWeight: 700,
              letterSpacing: 0.5,
            }}
          >
            {group.title}
          </Typography>
        )}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
            mt: group.title ? 1 : 0,
            pl: group.title ? 1 : 0,
            borderLeft: group.title ? '2px solid' : 'none',
            borderColor: 'divider',
          }}
        >
          {group.equations.map((eq, ei) => (
            <EquationBlock key={ei} rows={eq} />
          ))}
        </Box>
      </Box>
    ))}
  </Box>
);

// --- Adapters: snapshot → EquationDisplayProps ------------------------------

type FormatFns = {
  format: (value?: number) => string;
  round: (value?: number, decimals?: number) => string;
};

const amcAdapter = (
  d: AmcSnapshot,
  t: TypedTFunction<LocaleKey>,
  { format, round }: FormatFns,
  units: string
): EquationDisplayProps => {
  const heading = t('label.amc-forecast-calculation');
  const monthlyUsageSuffix = `${units} / month`;

  if (d.breakdown.source === 'plugin') {
    return {
      heading,
      groups: [
        {
          equations: [
            [
              {
                label: 'source',
                rhs: t('label.amc-from-plugin', { code: d.breakdown.code }),
              },
              {
                label: 'monthlyUsage',
                rhs: round(d.forecastMonthlyUsage, 2),
                suffix: monthlyUsageSuffix,
              },
            ],
          ],
        },
      ],
    };
  }

  // Default formula: AMC = totalConsumption / lookbackMonths × dosAdjustment.
  // The DOS adjustment row only appears when the preference is on (otherwise
  // the factor is always 1.0 and adds noise).
  const b = d.breakdown;
  const formulaRhs = b.daysOutOfStock != null
    ? 'totalConsumption / lookbackMonths × dosAdjustment'
    : 'totalConsumption / lookbackMonths';
  const substitutionRhs = b.daysOutOfStock != null
    ? `${round(b.totalConsumption, 2)} / ${format(b.lookbackMonths)} × ${round(b.dosAdjustmentFactor, 3)}`
    : `${round(b.totalConsumption, 2)} / ${format(b.lookbackMonths)}`;

  const equations: EquationLine[][] = [
    [
      { label: 'monthlyUsage', rhs: formulaRhs },
      { rhs: substitutionRhs },
      {
        rhs: round(d.forecastMonthlyUsage, 2),
        suffix: monthlyUsageSuffix,
      },
    ],
  ];

  if (b.daysOutOfStock != null) {
    equations.push([
      {
        label: 'dosAdjustment',
        rhs: 'numberOfDays / (numberOfDays − daysOutOfStock)',
      },
      {
        rhs: `${format(b.numberOfDays)} / (${format(b.numberOfDays)} − ${format(b.daysOutOfStock)})`,
      },
      { rhs: round(b.dosAdjustmentFactor, 3) },
    ]);
  }

  return { heading, groups: [{ equations }] };
};

const populationAdapter = (
  d: PopulationSnapshot,
  t: TypedTFunction<LocaleKey>,
  { format, round }: FormatFns,
  units: string
): EquationDisplayProps => ({
  heading: t('label.population-forecast-calculation'),
  groups: d.vaccineCourses.map(c => ({
    title: c.courseTitle,
    equations: [
      [
        {
          label: 'annualDoses',
          rhs: 'population × doses × coverage% × lossFactor',
        },
        {
          rhs: `${format(c.targetPopulation)} × ${format(c.numberOfDoses)} × (${format(c.coverageRate)} / 100) × ${round(c.lossFactor, 3)}`,
        },
        {
          rhs: round(c.annualTargetDoses, 2),
          suffix: t('label.doses-per-year'),
        },
      ],
      [
        {
          label: 'forecastDoses',
          rhs: 'annualDoses / 12 × (supplyPeriod + buffer)',
        },
        {
          rhs: `${round(c.annualTargetDoses, 2)} / 12 × (${format(c.supplyPeriodMonths)} + ${format(c.bufferStockMonths)})`,
        },
        {
          rhs: round(c.forecastDoses, 2),
          suffix: t('label.doses').toLowerCase(),
        },
      ],
      [
        { label: 'periodTotal', rhs: 'forecastDoses / dosesPerUnit' },
        {
          rhs: `${round(c.forecastDoses, 2)} / ${format(c.dosesPerUnit)}`,
        },
        {
          rhs: format(Math.ceil(c.forecastUnits)),
          suffix: units,
        },
      ],
      [
        {
          label: 'monthlyUsage',
          rhs: 'periodTotal / (supplyPeriod + buffer)',
        },
        {
          rhs: `${format(Math.ceil(c.forecastUnits))} / (${format(c.supplyPeriodMonths)} + ${format(c.bufferStockMonths)})`,
        },
        {
          rhs: round(c.forecastMonthlyUsage, 2),
          suffix: `${units} / month`,
        },
      ],
    ],
  })),
});

const ancillaryAdapter = (
  d: AncillaryRatioSnapshot,
  t: TypedTFunction<LocaleKey>,
  { format, round }: FormatFns,
  units: string
): EquationDisplayProps => ({
  heading: t('label.ancillary-ratio-forecast-calculation'),
  groups: [
    ...d.contributions.map(c => ({
      title: c.parentItemName,
      equations: [
        [
          {
            label: 'contribution',
            rhs: 'parentMonthlyUsage × (ancillaryQty / itemQty)',
          },
          {
            rhs: `${round(c.parentForecastMonthlyUsage, 2)} × (${format(c.ancillaryQuantity)} / ${format(c.itemQuantity)})`,
          },
          {
            rhs: round(c.monthlyUsage, 2),
            suffix: `${units} / month`,
          },
        ],
      ],
    })),
    {
      equations: [
        [
          {
            label: 'monthlyUsage',
            rhs: round(d.forecastMonthlyUsage, 2),
            suffix: `${units} / month`,
          },
        ],
      ],
    },
  ],
});

const pluginAdapter = (
  d: PluginSnapshot,
  _t: TypedTFunction<LocaleKey>,
  _fmt: FormatFns,
  units: string
): EquationDisplayProps => ({
  heading: d.pluginCode,
  groups: [
    {
      // Each plugin display row becomes its own equation block; rows that
      // only have a `result` collapse to a single line.
      equations: d.display.map(row => {
        const eq: EquationLine[] = [];
        if (row.formula) eq.push({ label: row.label, rhs: row.formula });
        if (row.substitution) {
          eq.push(
            eq.length === 0
              ? { label: row.label, rhs: row.substitution }
              : { rhs: row.substitution }
          );
        }
        eq.push(
          eq.length === 0
            ? { label: row.label, rhs: row.result }
            : { rhs: row.result }
        );
        return eq;
      }),
    },
    {
      equations: [
        [
          {
            label: 'monthlyUsage',
            rhs: d.forecastMonthlyUsage,
            suffix: `${units} / month`,
          },
        ],
      ],
    },
  ],
});

// --- Error renderer --------------------------------------------------------

/// Renders an Error outcome as an error severity Alert — matches the styling
/// already used for warning banners elsewhere in the request line edit modal
/// (see `<Alert severity="warning">` neighbours in RequestLineEdit.tsx).
const ErrorDisplay = ({ message }: { message: string }) => (
  <Box sx={{ width: '100%', maxWidth: 900, mx: 'auto' }}>
    <Alert severity="error" sx={{ mt: 1 }}>
      {message}
    </Alert>
  </Box>
);

const errorMessage = (
  snapshot: Extract<ForecastSnapshot, { status: 'error' }>,
  t: TypedTFunction<LocaleKey>
): string => {
  switch (snapshot.method) {
    case 'amc':
      return t('error.forecast-no-consumption-history', {
        months: snapshot.lookbackMonths,
      });
    case 'population':
      switch (snapshot.kind) {
        case 'missingStoreConfig': {
          const fields = snapshot.missingFields
            .map(f =>
              f === 'populationServed'
                ? t('label.population-served')
                : t('label.supply-interval')
            )
            .join(', ');
          return t('error.forecast-missing-store-config', { fields });
        }
        case 'noVaccineCourseForItem':
          return t('error.forecast-no-vaccine-course');
      }
    // eslint-disable-next-line no-fallthrough
    case 'ancillary_ratio':
      return t('error.forecast-no-parents-in-requisition');
    case 'plugin':
      switch (snapshot.kind) {
        case 'notFound':
          return t('error.forecast-plugin-not-found', {
            code: snapshot.pluginCode,
          });
        case 'invocationFailed':
          return t('error.forecast-plugin-failed', {
            message: snapshot.message,
          });
      }
  }
};

// --- Top-level component ---------------------------------------------------

interface ForecastCalculationDisplayProps {
  forecastData?: string | null;
  /// Item-specific unit label (e.g. "vials", "tablets") used as the suffix on
  /// final-unit results. Falls back to the generic "units" string.
  unitName?: string | null;
}

/// Parses the snapshot JSON, runs the appropriate adapter, and hands the
/// result to the single `EquationDisplay` renderer. Adding a new method only
/// requires writing one adapter — the rendering surface is shared.
const ForecastCalculationDisplay = ({
  forecastData,
  unitName,
}: ForecastCalculationDisplayProps) => {
  const t = useTranslation();
  const { round, format } = useFormatNumber();
  const { getPlural } = useIntlUtils();
  if (!forecastData) return null;
  let snapshot: ForecastSnapshot;
  try {
    snapshot = JSON.parse(forecastData) as ForecastSnapshot;
  } catch {
    return null;
  }
  if (snapshot.status === 'error') {
    return <ErrorDisplay message={errorMessage(snapshot, t)} />;
  }
  const fmt: FormatFns = { format, round };
  const trimmed = unitName?.trim();
  const units = trimmed
    ? getPlural(trimmed.toLowerCase(), 2)
    : t('label.units').toLowerCase();
  switch (snapshot.method) {
    case 'amc':
      return <EquationDisplay {...amcAdapter(snapshot, t, fmt, units)} />;
    case 'population':
      if (!snapshot.vaccineCourses?.length) return null;
      return <EquationDisplay {...populationAdapter(snapshot, t, fmt, units)} />;
    case 'ancillary_ratio':
      return <EquationDisplay {...ancillaryAdapter(snapshot, t, fmt, units)} />;
    case 'plugin':
      return <EquationDisplay {...pluginAdapter(snapshot, t, fmt, units)} />;
    default:
      return null;
  }
};

export default ForecastCalculationDisplay;
