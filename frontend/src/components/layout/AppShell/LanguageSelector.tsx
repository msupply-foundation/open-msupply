import { For, Show } from 'solid-js'
import * as DropdownMenu from '@kobalte/core/dropdown-menu'
import { TranslateIcon } from '../../icons'
import { languageOptions, languageLabel, isRtlLocale } from './languages'
import styles from './LanguageSelector.module.css'

interface LanguageSelectorProps {
  language: string
  onSelect: (value: string) => void
}

/*
 * Footer language selector. Kobalte DropdownMenu (headless) gives us the
 * trigger/popup wiring, focus management, type-ahead and keyboard nav; we own
 * all the markup + CSS, styled via its data-* state attributes. Opens upward
 * (placement="top-start") out of the footer. Picking an RTL-tagged language
 * flips the whole app to RTL (handled in AppShell). Solid analogue of the RnD
 * prototype's Radix DropdownMenu version — same reasoning.
 */
export const LanguageSelector = (props: LanguageSelectorProps) => (
  <DropdownMenu.Root placement="top-start" gutter={8}>
    <DropdownMenu.Trigger class={styles.trigger} title="Select language">
      <TranslateIcon class={styles.icon} />
      <span class={styles.triggerText}>{languageLabel(props.language)}</span>
    </DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content class={styles.content}>
        <div class={styles.heading}>Select language</div>
        <For each={languageOptions}>
          {(option) => (
            <DropdownMenu.Item
              class={styles.item}
              data-current={option.value === props.language ? 'true' : undefined}
              onSelect={() => props.onSelect(option.value)}
            >
              <span class={styles.itemLabel}>{option.label}</span>
              <Show when={isRtlLocale(option.value)}>
                <span class={styles.rtlTag}>RTL</span>
              </Show>
            </DropdownMenu.Item>
          )}
        </For>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
)
