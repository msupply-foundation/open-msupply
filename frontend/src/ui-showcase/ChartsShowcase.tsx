import { ContentContainer } from '../ui/layout/ContentContainer/ContentContainer';
import { Stack } from '../ui/layout/Stack/Stack';
import { DashboardCard } from '../ui/elements/dashboard/DashboardCard';
import {
  ConsumptionHistoryChart,
  StockEvolutionChart,
  TargetQuantityBreakdown,
  type ConsumptionHistoryPoint,
  type StockEvolutionPoint,
} from '../ui/elements/charts';
import { Lead, Row } from './common';

// --- Sample data, shaped like the wire nodes the real charts consume. ---

const consumptionData: ConsumptionHistoryPoint[] = (() => {
  const raw = [
    { m: '2025-08-01', v: 42, kind: 'historic' },
    { m: '2025-09-01', v: 55, kind: 'historic' },
    { m: '2025-10-01', v: 38, kind: 'historic' },
    { m: '2025-11-01', v: 61, kind: 'historic' },
    { m: '2025-12-01', v: 47, kind: 'historic' },
    { m: '2026-01-01', v: 52, kind: 'historic' },
    { m: '2026-02-01', v: 44, kind: 'historic' },
    { m: '2026-03-01', v: 58, kind: 'historic' },
    { m: '2026-04-01', v: 50, kind: 'current' },
    { m: '2026-05-01', v: 51, kind: 'projected' },
    { m: '2026-06-01', v: 51, kind: 'projected' },
    { m: '2026-07-01', v: 51, kind: 'projected' },
  ] as const;
  return raw.map((r, i) => {
    const window = raw.slice(Math.max(0, i - 2), i + 1);
    return {
      date: r.m,
      consumption: r.v,
      averageMonthlyConsumption: Math.round(
        window.reduce((sum, w) => sum + w.v, 0) / window.length
      ),
      isHistoric: r.kind === 'historic',
      isCurrent: r.kind === 'current',
    };
  });
})();

const stockData: StockEvolutionPoint[] = (() => {
  const raw = [
    { d: '2026-05-01', v: 210, historic: true },
    { d: '2026-05-08', v: 188, historic: true },
    { d: '2026-05-15', v: 160, historic: true },
    { d: '2026-05-22', v: 143, historic: true },
    { d: '2026-05-29', v: 121, historic: true },
    { d: '2026-06-05', v: 96, historic: true },
    { d: '2026-06-12', v: 150, historic: false },
    { d: '2026-06-19', v: 132, historic: false },
    { d: '2026-06-26', v: 118, historic: false },
    { d: '2026-07-03', v: 101, historic: false },
    { d: '2026-07-10', v: 88, historic: false },
    { d: '2026-07-17', v: 74, historic: false },
  ] as const;
  return raw.map(r => ({
    date: r.d,
    stockOnHand: r.v,
    minimumStockOnHand: 60,
    maximumStockOnHand: 180,
    isHistoric: r.historic,
    isProjected: !r.historic,
  }));
})();

export const ChartsShowcase = () => (
  <ContentContainer size="form" align="start">
    <Stack gap="lg">
      <DashboardCard title="Target quantity">
        <Lead>
          The target-quantity breakdown (original <code>StockDistribution</code>
          ) — a month-marker axis (0 → target months, each cell a month of AMC,
          the reorder threshold and target MOS called out) above horizontal
          value bars for stock on hand + suggested order, proportioned to the
          target. When stock exceeds the target the axis shrinks and the stock
          bar fills the row. With no average monthly consumption it shows an{' '}
          <em>Unable to calculate</em> line instead (second panel).
        </Lead>
        <Row>
          <TargetQuantityBreakdown
            averageMonthlyConsumption={15.5}
            availableStockOnHand={21}
            suggestedQuantity={0}
            thresholdMonths={1}
            targetMonths={3}
          />
          <TargetQuantityBreakdown
            averageMonthlyConsumption={0}
            availableStockOnHand={0}
            suggestedQuantity={0}
            thresholdMonths={1}
            targetMonths={3}
          />
        </Row>
      </DashboardCard>

      <DashboardCard title="Consumption History (monthly)">
        <Lead>
          Bars for monthly consumption, coloured by historic / current /
          projected, with a moving-average line overlaid, plus a per-band hover
          cursor + tooltip. Hover a bar to see the per-month readout.
        </Lead>
        <ConsumptionHistoryChart data={consumptionData} />
      </DashboardCard>

      <DashboardCard title="Stock evolution (past & projected)">
        <Lead>
          Stock-on-hand bars split past vs projected, with dashed min / max
          threshold lines drawn as two SVG paths. Same composition shape as
          above.
        </Lead>
        <StockEvolutionChart data={stockData} />
      </DashboardCard>
    </Stack>
  </ContentContainer>
);
