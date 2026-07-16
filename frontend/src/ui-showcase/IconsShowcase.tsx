import { createSignal, For, type Component } from 'solid-js';
import * as iconsModule from '../ui/icons';
import type { IconProps } from '../ui/icons';
import { RadioGroup, type RadioOption } from '../ui/elements/inputs/RadioGroup';
import styles from './IconsShowcase.module.css';

/*
 * Every icon in the library, rendered straight from `src/ui/icons` exports so
 * the gallery can't drift from the source — add an icon there and it appears
 * here. We take the named exports whose name ends in `Icon` (which skips the
 * MSupplyGuyLogo brand mark and the IconProps type), sorted for scanning. The
 * predicate narrows each entry to a component; the assertion stays contained in
 * this dev-only scaffolding.
 *
 * Icons paint with `currentColor` and size to `1em`, so previewing a size or
 * colour is just a font-size / `color` on the glyph box — driven by the two
 * switches below via data attributes (see the `.glyph` rules in the CSS).
 */
const icons = Object.entries(iconsModule)
  .filter(
    (entry): entry is [string, Component<IconProps>] =>
      entry[0].endsWith('Icon') && typeof entry[1] === 'function'
  )
  .sort(([a], [b]) => a.localeCompare(b));

const SIZE_OPTIONS: RadioOption[] = [
  { value: 'small', label: 'Small' },
  { value: 'large', label: 'Large' },
];

// Theme colours icons are actually used in: the two brand tones, the near-black
// body colour, and the disabled grey. Each maps to a token in the CSS.
const COLOUR_OPTIONS: RadioOption[] = [
  { value: 'primary', label: 'Primary' },
  { value: 'secondary', label: 'Secondary' },
  { value: 'body', label: 'Body text' },
  { value: 'disabled', label: 'Disabled' },
];

export const IconsShowcase = () => {
  const [size, setSize] = createSignal('large');
  const [colour, setColour] = createSignal('body');

  return (
    <div class={styles.stack}>
      <p class={styles.lead}>
        Every icon in <code>src/ui/icons</code>. Each is a plain SVG that paints
        with <code>currentColor</code> and sizes to <code>1em</code>, so colour
        follows the surrounding text and size follows font-size — use the
        switches to preview any size and theme colour.
      </p>
      <div class={styles.controls}>
        <RadioGroup
          label="Size"
          orientation="horizontal"
          options={SIZE_OPTIONS}
          value={size()}
          onChange={setSize}
        />
        <RadioGroup
          label="Colour"
          orientation="horizontal"
          options={COLOUR_OPTIONS}
          value={colour()}
          onChange={setColour}
        />
      </div>
      <ul class={styles.grid}>
        <For each={icons}>
          {([name, Icon]) => (
            <li class={styles.card}>
              <span
                class={styles.glyph}
                data-size={size()}
                data-colour={colour()}
              >
                <Icon />
              </span>
              <code class={styles.name}>{name}</code>
            </li>
          )}
        </For>
      </ul>
    </div>
  );
};
