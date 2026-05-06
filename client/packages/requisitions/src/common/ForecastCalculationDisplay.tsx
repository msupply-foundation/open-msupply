import React from 'react';
import {
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
}

interface AmcSnapshot {
  averageMonthlyConsumption: number;
  monthsOfStockTarget: number;
  availableStockOnHand: number;
  forecastUnits: number;
}

interface PopulationSnapshot {
  forecastTotalUnits: number;
  forecastTotalDoses: number;
  vaccineCourses: PopulationCourseData[];
}

interface AncillaryContribution {
  parentLineId: string;
  parentItemId: string;
  parentItemName: string;
  parentForecastUnits: number;
  itemQuantity: number;
  ancillaryQuantity: number;
  units: number;
}

interface AncillaryRatioSnapshot {
  forecastUnits: number;
  contributions: AncillaryContribution[];
  fallback?: string | null;
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
  forecastUnits: number;
  forecastDoses?: number | null;
  display: DisplayRow[];
}

// Server-side serde flattens the variant data alongside the `method` tag,
// so each branch's fields sit at the top level next to `method`.
type ForecastSnapshot =
  | ({ method: 'amc' } & AmcSnapshot)
  | ({ method: 'population' } & PopulationSnapshot)
  | ({ method: 'ancillary_ratio' } & AncillaryRatioSnapshot)
  | ({ method: 'plugin' } & PluginSnapshot);

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
): EquationDisplayProps => ({
  heading: t('label.amc-forecast-calculation'),
  groups: [
    {
      equations: [
        [
          { label: 'target', rhs: 'months × AMC' },
          {
            rhs: `${format(d.monthsOfStockTarget)} × ${round(d.averageMonthlyConsumption, 2)}`,
          },
          {
            rhs: format(Math.ceil(d.forecastUnits)),
            suffix: units,
          },
        ],
      ],
    },
  ],
});

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
        { label: 'target', rhs: 'forecastDoses / dosesPerUnit' },
        {
          rhs: `${round(c.forecastDoses, 2)} / ${format(c.dosesPerUnit)}`,
        },
        {
          rhs: format(Math.ceil(c.forecastUnits)),
          suffix: units,
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
  warning: d.fallback ? t('warning.ancillary-ratio-fallback') : undefined,
  groups: [
    ...d.contributions.map(c => ({
      title: c.parentItemName,
      equations: [
        [
          {
            label: 'contribution',
            rhs: 'parentTarget × (ancillaryQty / itemQty)',
          },
          {
            rhs: `${round(c.parentForecastUnits, 2)} × (${format(c.ancillaryQuantity)} / ${format(c.itemQuantity)})`,
          },
          {
            rhs: round(c.units, 2),
            suffix: units,
          },
        ],
      ],
    })),
    {
      equations: [
        [
          {
            label: 'target',
            rhs: round(d.forecastUnits, 2),
            suffix: units,
          },
        ],
      ],
    },
  ],
});

const pluginAdapter = (
  d: PluginSnapshot,
  t: TypedTFunction<LocaleKey>,
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
            label: t('label.total').toLowerCase(),
            rhs: d.forecastUnits,
            suffix: units,
          },
        ],
      ],
    },
  ],
});

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
