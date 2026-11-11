import { createEffect, on } from 'solid-js';
import { useComboboxContext } from '@kobalte/core/combobox';
import { nextHighlightKey } from './comboboxLogic';

/*
 * Once the user has typed, keep the first matching option highlighted, so
 * Enter picks it straight away — type "para", Enter, done. Kobalte leaves
 * nothing highlighted after a keystroke (its input-change handler clears the
 * focused option), so without this choosing by keyboard meant reaching for the
 * arrow keys after every search. Arrowing or hovering still moves the
 * highlight as before; this only fills it in when there is none, or when the
 * one there has dropped out of the results. "None" includes after ArrowLeft /
 * ArrowRight, which Kobalte answers by clearing the highlight: moving the caret
 * to fix a typo puts it back on the first match, not on a row arrowed to.
 *
 * Only while there is a QUERY: a picker merely opened (or reopened on its
 * committed selection, where Kobalte highlights the selection itself) shows
 * nothing to commit, and Enter there must not choose an option the user never
 * asked for.
 *
 * Renders nothing. Must sit inside a KCombobox.Root, whose context it drives —
 * Kobalte has no prop for this.
 */
export const HighlightFirstMatch = <T,>(props: {
  /** What the user has typed, '' when the input isn't a search. */
  query: () => string;
  /** Listed but not a match for the query — see skipsHighlight. */
  skip?: (item: T) => boolean;
}) => {
  const context = useComboboxContext();
  createEffect(
    on(
      [
        () => props.query(),
        context.isOpen,
        () => context.listState().collection(),
        // Tracked so a highlight Kobalte clears AFTER the results settle (it
        // clears on every input change, which can land after this has run) is
        // filled straight back in.
        () => context.listState().selectionManager().focusedKey(),
      ],
      ([query, open, collection, focused], previous) => {
        if (!open) return;
        const key = nextHighlightKey<T>({
          query,
          queryChanged: previous === undefined || previous[0] !== query,
          nodes: collection,
          focused,
          skip: props.skip,
        });
        if (key !== undefined)
          context.listState().selectionManager().setFocusedKey(key);
      }
    )
  );
  return null;
};
