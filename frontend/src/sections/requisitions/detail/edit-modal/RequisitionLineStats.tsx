import { For, Show, type Component, type JSX } from 'solid-js';
import { t } from '../../../../intl';
import { formatNumber, round } from '../../../../intl/formatNumber';
import { Tabs, TabList, TabPanel } from '../../../../ui/elements/tabs/Tabs';
import {
  ForecastCalculationDisplay,
  type VaccineCourse,
} from '../../../../domain/forecast';
import {
  figureInMode,
  modeWord,
  type EntryMode,
  type LineStats,
} from './requisitionLineEdit';
import styles from './RequisitionLineStats.module.css';

// The line editor's two read-only stats tabs (spec S4 § stats tabs): My store
// — the proportional stacked our-stock / requested bars — and Customer — the
// target-quantity breakdown (or the population-forecast calculation display,
// AC-LE13) with the volume block beneath (AC-LE12). Every quantity displays
// re-expressed in the active representation, rounded UP to a whole number
// (the figure rows' rounding), and swapping the representation recalculates
// the bars. Both summaries come from a server read keyed on the SAVED line —
// a not-yet-saved item has none (D75) and the tabs sit in their empty state.

// The two sections' relative widths (the reference's calculatePercentage):
// each section's bar is sized against the OTHER section's total, so the two
// read against each other.
const percent = (part: number, total: number): number =>
  total === 0 ? 0 : part >= total ? 100 : Math.round((100 * part) / total);

// The month-axis text shows only when the axis is wide enough for it.
const MIN_AXIS_WIDTH_FOR_TEXT = 5;

type Segment = {
  label: string;
  value: number;
  fillClass: string;
  /** The legend row can be withheld while the bar segment still draws
   *  (other-requested on a Finalised requisition). */
  legend: boolean;
};

export const RequisitionLineStats: Component<{
  stats: LineStats | undefined;
  entryMode: EntryMode;
  packSize: number;
  unitName: string | null;
  /** Withholds the other-stores legend row (spec S4 § stats tabs). */
  finalised: boolean;
  /** The forecast calculation display stands in for the breakdown (AC-LE13). */
  showForecast: boolean;
  courses: VaccineCourse[];
  /** The volume block's live figures (AC-LE12); null on a snapshot-less line. */
  volume: {
    locationTypeName: string;
    availableVolume: number;
    itemVolume: number;
  } | null;
}> = props => {
  // A stored unit quantity → the active representation, rounded UP (the same
  // rounding as the figure rows, so a bar never disagrees with its figure).
  const q = (units: number) =>
    figureInMode(units, props.entryMode, props.packSize);
  const measure = () => modeWord(props.entryMode, props.unitName);
  const legendValue = (value: number) =>
    `${formatNumber(value)} ${measure()}`;

  // One stats section: heading, the proportional stacked bar (sized against
  // the sibling section via `width`), and its legend — or the italic info
  // note when every value is zero.
  const BarSection = (p: {
    heading: string;
    width: number;
    segments: Segment[];
    emptyMessage: string;
  }): JSX.Element => {
    const total = () => p.segments.reduce((sum, s) => sum + s.value, 0);
    return (
      <Show
        when={total() > 0}
        fallback={
          <p class={styles.emptyNote} role="status">
            <span aria-hidden="true">ⓘ</span> {p.emptyMessage}
          </p>
        }
      >
        <section class={styles.section}>
          <h3 class={styles.sectionHeading}>{p.heading}</h3>
          <div class={styles.barTrack} style={{ width: `${p.width}%` }}>
            <For each={p.segments}>
              {segment => (
                <Show when={segment.value !== 0}>
                  <div
                    class={`${styles.segment} ${segment.fillClass}`}
                    style={{
                      'flex-basis': `${Math.min(Math.round((100 * segment.value) / total()), 100)}%`,
                    }}
                    title={`${segment.label}: ${legendValue(segment.value)}`}
                  />
                </Show>
              )}
            </For>
          </div>
          <ul class={styles.legend}>
            <For each={p.segments.filter(s => s.legend)}>
              {segment => (
                <li class={styles.legendRow}>
                  <span
                    class={`${styles.swatch} ${segment.fillClass}`}
                    aria-hidden="true"
                  />
                  <span class={styles.legendLabel}>{segment.label}</span>
                  <span class={styles.legendValue}>
                    {legendValue(segment.value)}
                  </span>
                </li>
              )}
            </For>
          </ul>
        </section>
      </Show>
    );
  };

  // My store (spec S4 § stats tabs): our stock through the neutral ramp,
  // requested through the primary ramp — each darkest-first.
  const MyStore = (): JSX.Element => {
    const s = () => props.stats?.responseStoreStats;
    const soh = () => q(s()?.stockOnHand ?? 0);
    const incoming = () => q(s()?.incomingStock ?? 0);
    const onOrder = () => q(s()?.stockOnOrder ?? 0);
    const requested = () => q(s()?.requestedQuantity ?? 0);
    const other = () => q(s()?.otherRequestedQuantity ?? 0);
    const ourTotal = () => soh() + incoming() + onOrder();
    const requestedTotal = () => requested() + other();
    return (
      <>
        <BarSection
          heading={t('label.our-stock')}
          width={percent(ourTotal(), requestedTotal())}
          emptyMessage={t('messages.requisition-no-stock')}
          segments={[
            {
              label: t('label.stock-on-hand'),
              value: soh(),
              fillClass: styles.stockDarkFill,
              legend: true,
            },
            {
              label: t('label.incoming-stock'),
              value: incoming(),
              fillClass: styles.stockMainFill,
              legend: true,
            },
            {
              label: t('label.stock-on-order'),
              value: onOrder(),
              fillClass: styles.stockLightFill,
              legend: true,
            },
          ]}
        />
        <BarSection
          heading={t('label.customer-requested')}
          width={percent(requestedTotal(), ourTotal())}
          emptyMessage={t('messages.no-requested-quantities')}
          segments={[
            {
              label: t('label.requested-quantity'),
              value: requested(),
              fillClass: styles.requestedFill,
              legend: true,
            },
            {
              label: t('label.other-requested-quantity'),
              value: other(),
              fillClass: styles.otherRequestedFill,
              legend: !props.finalised,
            },
          ]}
        />
      </>
    );
  };

  // The Customer tab's target-quantity breakdown (spec S4 § stats tabs): a
  // months-of-stock axis (0 → max months, each division the cumulative AMC)
  // over the stock-on-hand and suggested-order bars, proportioned to the
  // target quantity. The unable-to-calculate notes sit ABOVE the axis — both
  // can show at once — with the axis still rendered.
  const TargetBreakdown = (): JSX.Element => {
    const s = () => props.stats?.requestStoreStats;
    const amc = () => q(s()?.averageMonthlyConsumption ?? 0);
    const soh = () => q(s()?.stockOnHand ?? 0);
    const suggested = () => q(s()?.suggestedQuantity ?? 0);
    const maxMonths = () => s()?.maxMonthsOfStock ?? 0;
    const target = () => maxMonths() * amc();
    const axisWidth = () => percent(target(), soh());
    const showText = () => axisWidth() > MIN_AXIS_WIDTH_FOR_TEXT;
    const months = () =>
      Array.from({ length: Math.ceil(maxMonths()) }, (_, i) => i + 1);
    const monthText = (m: number) =>
      `${formatNumber(Math.ceil(amc() * m))}${showText() ? ` (${m} ${m === 1 ? t('label.month') : t('label.months')})` : ''}`;
    const barFlex = (value: number) =>
      target() === 0
        ? 0
        : Math.min(Math.round((100 * value) / target()), 100);
    return (
      <section class={styles.section}>
        <Show when={amc() === 0}>
          <p class={styles.calcNote} role="status">
            {t('error.unable-to-calculate')}: {t('error.amc-is-zero')}
          </p>
        </Show>
        <Show when={soh() === 0 && suggested() === 0}>
          <p class={styles.calcNote} role="status">
            {t('error.unable-to-calculate')}:{' '}
            {t('error.soh-and-suggested-quantity-are-zero')}
          </p>
        </Show>
        <h3 class={styles.sectionHeading}>
          {`${t('heading.target-quantity')} (${measure()})`}
        </h3>
        <div class={styles.monthAxis} style={{ width: `${axisWidth()}%` }}>
          <div class={styles.monthEdge}>
            <Show when={showText()}>
              <span class={styles.monthEdgeLabel}>0</span>
            </Show>
          </div>
          <For each={months()}>
            {m => (
              <div class={styles.monthCell} title={monthText(m)}>
                <div class={styles.monthValue}>{monthText(m)}</div>
              </div>
            )}
          </For>
        </div>
        <div class={styles.valueBars}>
          <div class={styles.divider} />
          <Show when={soh() > 0}>
            <div
              class={styles.valueBar}
              style={{ 'flex-basis': `${barFlex(soh())}%` }}
              title={`${t('label.stock-on-hand')}: ${legendValue(soh())}`}
            >
              <div class={`${styles.valueFill} ${styles.stockMainFill}`}>
                <span class={styles.valueNum}>{formatNumber(soh())}</span>
              </div>
              <div class={styles.valueLabel}>{t('label.stock-on-hand')}</div>
            </div>
            <div class={styles.divider} />
          </Show>
          <Show when={suggested() > 0}>
            <div
              class={styles.valueBar}
              style={{ 'flex-basis': `${barFlex(suggested())}%` }}
              title={`${t('label.suggested-order-quantity')}: ${legendValue(suggested())}`}
            >
              <div class={`${styles.valueFill} ${styles.otherRequestedFill}`}>
                <span class={styles.valueNum}>{formatNumber(suggested())}</span>
              </div>
              <div class={styles.valueLabel}>
                {t('label.suggested-order-quantity')}
              </div>
            </div>
            <div class={styles.divider} />
          </Show>
        </div>
      </section>
    );
  };

  // The volume block (AC-LE12), beneath the breakdown — or the forecast
  // display — on a line carrying the customer's volume snapshot. Guidance
  // only: the live item volume at the typed supply, then the remaining
  // capacity or the bold no-capacity message.
  const VolumeBlock = (): JSX.Element => {
    const remaining = () =>
      props.volume!.availableVolume - props.volume!.itemVolume;
    return (
      <section class={styles.section}>
        <h3 class={styles.sectionHeading}>{t('label.volume')}</h3>
        <p class={styles.volumeLine}>
          {t('label.volume-for-item', {
            itemVolume: round(props.volume!.itemVolume, 5),
          })}
        </p>
        <Show
          when={remaining() > 0}
          fallback={
            <p class={`${styles.volumeLine} ${styles.volumeFull}`}>
              {t('label.location-type-full', {
                locationType: props.volume!.locationTypeName,
              })}
            </p>
          }
        >
          <p class={styles.volumeLine}>
            {t('label.available-volume-for-location-type', {
              locationType: props.volume!.locationTypeName,
              availableVolume: round(remaining(), 5),
            })}
          </p>
        </Show>
      </section>
    );
  };

  return (
    <div class={styles.tabs}>
      <Tabs defaultValue="my-store">
        <TabList
          label={t('label.details')}
          tabs={[
            { value: 'my-store', label: t('label.my-store') },
            { value: 'customer', label: t('label.customer') },
          ]}
        />
        <TabPanel value="my-store">
          <div class={styles.panelBody}>
            <MyStore />
          </div>
        </TabPanel>
        <TabPanel value="customer">
          <div class={styles.panelBody}>
            <Show
              when={props.showForecast && props.courses.length > 0}
              fallback={<TargetBreakdown />}
            >
              <ForecastCalculationDisplay courses={props.courses} />
            </Show>
            <Show when={props.volume}>
              <VolumeBlock />
            </Show>
          </div>
        </TabPanel>
      </Tabs>
    </div>
  );
};
