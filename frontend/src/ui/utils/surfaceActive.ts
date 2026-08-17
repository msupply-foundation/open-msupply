import { createContext, useContext } from 'solid-js';

/*
 * "The surface I am rendered in is currently showing."
 *
 * Provided by a surface that stays MOUNTED while it is not showing — today only
 * `<Dialog>`, whose content deliberately stays in the tree so a call site can
 * keep it rendered and flip `open` (several editors reset drafts on close and
 * would refetch if the content unmounted).
 *
 * `createAction` folds this into every action's `disabled`, which makes
 * spec/keyboard KB-R1's "registered only while it is actually available" hold for
 * an action declared INSIDE dialog content — where `onCleanup` alone cannot carry
 * it, because nothing cleans up when a mounted dialog merely closes. Without it
 * a closed dialog keeps answering its own keys, and an `always`-tier binding
 * (the stocktake line editor's bare `+`) leaks app-wide: it fires on every
 * screen, inside every text field, for a surface the user cannot see.
 *
 * A context rather than a prop each author threads, for the same reason as
 * `inTableCell`: whether a surface is showing is a fact of WHERE the action is
 * declared, and the failure mode of forgetting is silent (kdd/keyboard-layer).
 */

export const SurfaceActiveContext = createContext<() => boolean>();

export const useSurfaceActive = () => useContext(SurfaceActiveContext);
