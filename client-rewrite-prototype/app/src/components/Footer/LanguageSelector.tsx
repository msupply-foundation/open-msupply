import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { TranslateIcon } from '@/components/icons';
import { useLocale } from '@/intl/localeContext';
import { languageOptions, languageLabel, isRtlLocale } from '@/intl/languages';
import footer from './Footer.module.css';
import menu from './LanguageSelector.module.css';

/*
 * Footer language selector. Uses Radix DropdownMenu (headless): we get the
 * trigger/popup wiring, focus management, type-ahead and keyboard nav for free,
 * and own all the markup + CSS. Opens upward (side="top") from the footer.
 *
 * Picking an RTL language (tagged below) flips the whole app via LocaleProvider.
 */
export const LanguageSelector = () => {
  const { language, setLanguage } = useLocale();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" className={footer.cell} title="Select language">
          <TranslateIcon className={footer.icon} />
          <span className={footer.cellText}>{languageLabel(language)}</span>
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={menu.content}
          side="top"
          align="start"
          sideOffset={8}
        >
          <div className={menu.heading}>Select language</div>
          {languageOptions.map(option => (
            <DropdownMenu.Item
              key={option.value}
              className={menu.item}
              data-current={option.value === language}
              onSelect={() => setLanguage(option.value)}
            >
              <span className={menu.label}>{option.label}</span>
              {isRtlLocale(option.value) && (
                <span className={menu.rtlTag}>RTL</span>
              )}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
