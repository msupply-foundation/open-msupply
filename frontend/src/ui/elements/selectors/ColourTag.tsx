import { For } from 'solid-js';
import { t } from '../../../intl';
import { Popover, type PopoverPlacement } from '../feedback/Popover';
import styles from './ColourTag.module.css';

/*
 * Colour tag — a user-set colour on a record, for visual grouping only.
 *
 * - `ColourTagDot`: read-only, render instead of picker.
 * - `ColourTagPicker`: the dot with a Popover that opens the colour swatches.
 */
export const TAG_COLOURS = [
  // `name` is the stable identifier the e2e contract's `colour-swatch-<name>`
  // testids are built from (e2e/TESTIDS.md) — never derive those from the
  // i18n key, which can be renamed without anyone thinking of the DOM contract.
  { name: 'blue', value: '#004fc4', label: 'colour.blue' },
  { name: 'green', value: '#05a660', label: 'colour.green' },
  { name: 'red', value: '#ff3b3b', label: 'colour.red' },
  { name: 'yellow', value: '#ffcc00', label: 'colour.yellow' },
  { name: 'aqua', value: '#00b7c4', label: 'colour.aqua' },
  { name: 'grey', value: '#8f90a6', label: 'colour.grey' },
] as const;

export type ColourTagVariant = 'row' | 'field';

export const ColourTagDot = (props: {
  // null = invisible spacer. Pending
  // https://github.com/msupply-foundation/open-msupply-frontend/issues/181
  // hide or show ring
  colour: string | null;
}) => (
  <span
    class={styles.dot}
    style={{ '--tag-colour': props.colour ?? 'transparent' }}
    aria-hidden="true"
    onClick={e => e.stopPropagation()}
  />
);

export const ColourTagPicker = (props: {
  // null = ring
  colour: string | null;
  onSelect: (colour: string) => void;
  /** Accessible name for the trigger; defaults to the standard "Tag colour". */
  label?: string;
  variant?: ColourTagVariant;
  placement?: PopoverPlacement;
}) => (
  <span class={styles.picker} onClick={e => e.stopPropagation()}>
    <Popover
      placement={props.placement ?? 'bottom-start'}
      triggerLabel={props.label ?? t('colour.label')}
      triggerTestId="colour-picker-button"
      triggerClass={props.variant === 'field' ? styles.fieldTrigger : undefined}
      trigger={
        props.colour ? (
          <span class={styles.dot} style={{ '--tag-colour': props.colour }} />
        ) : (
          <span class={`${styles.dot} ${styles.dotEmpty}`} />
        )
      }
      closeOnClickInside
    >
      <div class={styles.swatches}>
        <For each={TAG_COLOURS}>
          {option => (
            <button
              type="button"
              class={styles.swatch}
              style={{ '--tag-colour': option.value }}
              data-testid={`colour-swatch-${option.name}`}
              aria-label={t(option.label)}
              title={t(option.label)}
              data-selected={
                props.colour?.toLowerCase() === option.value ? '' : undefined
              }
              onClick={() => props.onSelect(option.value)}
            />
          )}
        </For>
      </div>
    </Popover>
  </span>
);
