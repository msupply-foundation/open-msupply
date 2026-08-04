import { createContext, useContext } from 'solid-js';

/*
 * "This control is rendered inside a table cell."
 *
 * Needed by spec/keyboard KB-S2: a numeric field steps its value with the arrow
 * keys (KB-S1), but "a numeric field INSIDE A TABLE CELL instead lets arrow keys
 * move the text cursor, and MUST NOT step the value or move the row focus".
 *
 * A CONTEXT the field claims itself, not a prop each cell renderer passes.
 * Whether a control sits in a cell is a fact of WHERE IT IS RENDERED — the
 * table's to know, not something forty column definitions should each remember,
 * with a silent failure whenever one forgets (the same reasoning
 * kdd/focus-targets gives for the filter chip claiming its own focus target).
 *
 * Provided ONCE at the table root, never per `<td>`: a provider per cell would be
 * thousands of contexts on a long table for one boolean that is the same in all
 * of them.
 *
 * DIALOG RESETS IT. A line-edit modal is opened from a row and renders inside
 * that row's subtree, and Solid contexts follow the owner tree — so without the
 * reset every NumberField in the modal would believe it was in a cell and stop
 * stepping. `Dialog` provides `false` for exactly that reason.
 */

export const InTableCellContext = createContext<boolean>(false);

export const useInTableCell = (): boolean => useContext(InTableCellContext);
