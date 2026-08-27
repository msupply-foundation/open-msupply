import { createSignal, For, Show } from 'solid-js';
import { t } from '../../../intl';
import { Popover, type PopoverPlacement } from '../feedback/Popover';
import { TextField } from '../inputs/TextField';
import { Button } from '../buttons/Button';
import { Text } from '../typography/Text';
import { isValidHexColour, normaliseHexColour } from './colourHex';
import styles from './ColourTag.module.css';

/*
 * Colour tag — a user-set colour on a record, for visual grouping only.
 *
 * - `ColourTagDot`: read-only, render instead of picker.
 * - `ColourTagPicker`: the dot with a Popover that opens the colour swatches.
 *   Opt-in custom-entry mode (`allowCustom` + `onReset`) adds a hex entry and
 *   a Reset under the swatches (SET-05.40, the store editor's colour
 *   preference).
 */
export const TAG_COLOURS = [
  // `name` is the stable identifier the e2e contract's `colour-swatch-<name>`
  // testids are built from (e2e/TESTIDS.md) — never derive those from the
  // i18n key, which can be renamed without anyone thinking of the DOM contract
  // (main's translation overhaul renamed colour.* → label.* under this PR).
  { name: 'blue', value: '#004fc4', label: 'label.blue' },
  { name: 'green', value: '#05a660', label: 'label.green' },
  { name: 'red', value: '#ff3b3b', label: 'label.red' },
  { name: 'yellow', value: '#ffcc00', label: 'label.yellow' },
  { name: 'aqua', value: '#00b7c4', label: 'label.aqua' },
  { name: 'grey', value: '#8f90a6', label: 'label.grey' },
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
  /** Adds the custom hex entry section under the swatches (SET-05.40). */
  allowCustom?: boolean;
  /** With `allowCustom`: renders the Reset action, which commits no colour. */
  onReset?: () => void;
}) => {
  // The hex entry's draft — re-seeded from the record's colour on every open,
  // so a reopened picker shows what's stored, not last session's typing.
  const [hex, setHex] = createSignal('');
  const committable = () => isValidHexColour(hex());
  // Empty input is idle, not an error (rules § The store editor › Preferences).
  const showInvalid = () => hex().trim() !== '' && !committable();

  const Swatches = (swatchProps: { onPick: (colour: string) => void }) => (
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
            onClick={() => swatchProps.onPick(option.value)}
          />
        )}
      </For>
    </div>
  );

  return (
    <span class={styles.picker} onClick={e => e.stopPropagation()}>
      <Popover
        placement={props.placement ?? 'bottom-start'}
        triggerLabel={props.label ?? t('label.tag-colour')}
        triggerTestId="colour-picker-button"
        triggerClass={
          props.variant === 'field' ? styles.fieldTrigger : undefined
        }
        trigger={
          props.colour ? (
            <span class={styles.dot} style={{ '--tag-colour': props.colour }} />
          ) : (
            <span class={`${styles.dot} ${styles.dotEmpty}`} />
          )
        }
        // Custom mode closes on COMMIT (swatch pick, hex commit, Reset) via
        // close() below — an inside click on the hex input must not dismiss.
        closeOnClickInside={!props.allowCustom}
        onOpen={
          props.allowCustom ? () => setHex(props.colour ?? '') : undefined
        }
      >
        {(close: () => void) => (
          <Show
            when={props.allowCustom}
            fallback={<Swatches onPick={props.onSelect} />}
          >
            {(() => {
              const commit = () => {
                if (!committable()) return;
                props.onSelect(normaliseHexColour(hex()));
                close();
              };
              return (
                <div class={styles.customPanel}>
                  <Text variant="subtitle">{t('label.colour-preset')}</Text>
                  <Swatches
                    onPick={colour => {
                      props.onSelect(colour);
                      close();
                    }}
                  />
                  <Text variant="subtitle">{t('label.colour-custom')}</Text>
                  <div class={styles.customRow}>
                    <TextField
                      label={t('label.colour-custom')}
                      hideLabel
                      // A real example (the preset blue, the helper's own
                      // example) — deliberately not the current app's
                      // `#RRGGBB` format-notation placeholder.
                      placeholder="#004fc4"
                      value={hex()}
                      error={
                        showInvalid()
                          ? t('message.colour-invalid-format')
                          : undefined
                      }
                      helperText={t('message.colour-enter-hex')}
                      data-testid="colour-hex-input"
                      onInput={event => setHex(event.currentTarget.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          commit();
                        }
                      }}
                    />
                    <button
                      type="button"
                      class={`${styles.swatch} ${styles.previewSwatch}`}
                      style={{
                        '--tag-colour': committable()
                          ? normaliseHexColour(hex())
                          : 'transparent',
                      }}
                      aria-label={t('label.colour-preview')}
                      title={t('label.colour-preview')}
                      data-testid="colour-hex-commit"
                      disabled={!committable()}
                      onClick={commit}
                    />
                  </div>
                  <Show when={props.onReset}>
                    <Button
                      variant="secondary"
                      class={styles.resetButton}
                      data-testid="colour-reset"
                      onClick={() => {
                        props.onReset?.();
                        close();
                      }}
                    >
                      {t('button.reset')}
                    </Button>
                  </Show>
                </div>
              );
            })()}
          </Show>
        )}
      </Popover>
    </span>
  );
};
