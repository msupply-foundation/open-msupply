import { For, Show } from 'solid-js';
import * as DropdownMenu from '@kobalte/core/dropdown-menu';
import { TranslateIcon } from '../../icons';
import { languageOptions, LOCALE_META, t } from '../../../intl';
import styles from './LanguageSelector.module.css';

interface LanguageSelectorProps {
  language: string;
  onSelect: (value: string) => void;
}

// The options come from the intl module's single source of truth
// (SUPPORTED_LOCALES) — the only locales with a dictionary that changeLanguage
// will actually switch to. Offering more here silently no-ops on select.
const labelFor = (value: string) =>
  languageOptions.find(o => o.value === value)?.label ?? value;

/*
 * Footer language selector. Kobalte DropdownMenu (headless) gives us the
 * trigger/popup wiring, focus management, type-ahead and keyboard nav; we own
 * all the markup + CSS, styled via its data-* state attributes. Opens upward
 * (placement="top-start") out of the footer. Picking an RTL locale flips the
 * whole app to RTL (App.tsx owns document.dir off the locale signal). Solid
 * analogue of the RnD prototype's Radix DropdownMenu version — same reasoning.
 */
export const LanguageSelector = (props: LanguageSelectorProps) => (
  <DropdownMenu.Root placement="top-start" gutter={8}>
    <DropdownMenu.Trigger class={styles.trigger} title={t('language.select')}>
      <TranslateIcon class={styles.icon} />
      <span class={styles.triggerText}>{labelFor(props.language)}</span>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content class={styles.content}>
        <div class={styles.heading}>{t('language.select')}</div>
        <For each={languageOptions}>
          {option => (
            <DropdownMenu.Item
              class={styles.item}
              data-current={
                option.value === props.language ? 'true' : undefined
              }
              onSelect={() => props.onSelect(option.value)}
            >
              <span class={styles.itemLabel}>{option.label}</span>
              <Show when={LOCALE_META[option.value].dir === 'rtl'}>
                <span class={styles.rtlTag}>{t('language.rtl')}</span>
              </Show>
            </DropdownMenu.Item>
          )}
        </For>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);
