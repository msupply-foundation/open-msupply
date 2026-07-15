import { For } from 'solid-js';
import { Popover, type PopoverPlacement } from '../feedback/Popover';
import styles from './ColourTag.module.css';

/*
 * Colour tag — a user-set colour on a record, for visual grouping only.
 *
 * - `ColourTagDot`: read-only, render instead of picker.
 * - `ColourTagPicker`: the dot with a Popover that opens the colour swatches.
 */

export interface ColourTagOption {
  // The  colour value (e.g. '#004fc4')
  value: string;
  // Name of the colour (e.g. "Blue")
  label: string;
}

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
  options: ColourTagOption[];
  onSelect: (colour: string) => void;
  label: string;
  variant?: ColourTagVariant;
  placement?: PopoverPlacement;
}) => (
  <span class={styles.picker} onClick={e => e.stopPropagation()}>
    <Popover
      placement={props.placement ?? 'bottom-start'}
      triggerLabel={props.label}
      triggerClass={props.variant === 'field' ? styles.fieldTrigger : undefined}
      trigger={
        props.colour ? (
          <span class={styles.dot} style={{ '--tag-colour': props.colour }} />
        ) : (
          <span class={`${styles.dot} ${styles.dotEmpty}`} />
        )
      }
    >
      <div class={styles.swatches}>
        <For each={props.options}>
          {option => (
            <button
              type="button"
              class={styles.swatch}
              style={{ '--tag-colour': option.value }}
              aria-label={option.label}
              title={option.label}
              data-selected={
                props.colour?.toLowerCase() === option.value.toLowerCase()
                  ? ''
                  : undefined
              }
              onClick={() => props.onSelect(option.value)}
            />
          )}
        </For>
      </div>
    </Popover>
  </span>
);
