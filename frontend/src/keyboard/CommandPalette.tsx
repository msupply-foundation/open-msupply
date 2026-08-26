import { createMemo } from 'solid-js';
import {
  CommandPaletteView,
  type PaletteEntry,
} from '../ui/elements/keyboard/CommandPaletteView';
import { actionName, registeredActions } from '../ui/utils/keyActions';
import { locale, t } from '../intl';

/*
 * The palette's app-side host: it turns the registry into rows and hands them
 * to the presentational view (spec/keyboard ui-surface S1).
 *
 * The snapshot is taken PER OPEN, not reactively (kdd/keyboard-layer): while
 * the palette is up it is modal and focus-trapped, so nothing behind it can
 * mount or unmount, and the set cannot change under the user. `props.open` is
 * the memo's only dependency, so opening re-reads the registry and closing
 * drops it.
 */

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export const CommandPalette = (props: CommandPaletteProps) => {
  const entries = createMemo<readonly PaletteEntry[]>(() => {
    if (!props.open) return [];

    // Collator, not `<` or a bare localeCompare: three locales, one of them
    // RTL, and alphabetical has to mean alphabetical in the reader's language.
    const collator = new Intl.Collator(locale());

    return (
      registeredActions()
        // KB-P3: "An action whose name is empty MUST NOT be listed — a nameless
        // entry exists to own a shortcut, not to be found by browsing."
        .filter(action => action.name !== undefined)
        // A disabled action is inert AND unlisted (one field — see KeyAction).
        .filter(action => action.disabled?.() !== true)
        .map((action, index) => {
          // Resolved HERE, per open, so a language switch re-translates the
          // whole list — whichever `name` form the action carries.
          const name = actionName(action);
          return {
            // Registration order is stable within a snapshot, and the index
            // keeps two same-named actions distinct as list rows.
            id: `${name}-${index}`,
            name,
            keywords: action.keywords?.map(key => t(key)),
            ...(action.shortcut ? { shortcut: action.shortcut } : {}),
            run: action.run,
          };
        })
        // KB-P3: alphabetically BY NAME. Sorting on the name alone, before the
        // view appends the parenthesised keys, so "Go to: Home (Option+D)"
        // does not sort under its modifier.
        .sort((a, b) => collator.compare(a.name, b.name))
    );
  });

  return (
    <CommandPaletteView
      open={props.open}
      onClose={props.onClose}
      entries={entries()}
    />
  );
};
