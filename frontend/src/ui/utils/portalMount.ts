import { createContext, useContext, type Accessor } from 'solid-js';

// Where a portaled popup (Select / Combobox listbox, etc.) should mount.
//
// The TOP LAYER is the reason this exists. It paints above every normal-flow
// element whatever its z-index, so a popup portaled to <body> from inside a
// top-layer surface is drawn BEHIND that surface and takes no clicks — the hit
// test lands on the surface covering it. Mounting the popup INSIDE the surface
// fixes both: it shares that top-layer box. Two surfaces put us there:
//
//   - a native <dialog> opened with showModal(), which additionally makes
//     everything outside it `inert` — so a <body>-portaled popup can't be
//     clicked even where it isn't covered;
//   - a native popover panel (`popover="auto"` — ui/elements/feedback/Popover),
//     where mounting inside also keeps a click on an option "inside" the
//     popover, so light dismiss doesn't close it out from under the pointer
//     (#1107: the rows-per-page Select in the table's ⚙ Settings panel).
//
// In both, the surface's own `overflow` must not clip the popup: each clips on
// an inner body element, not on the box that is the mount (Dialog.module.css,
// Popover.module.css).
//
// The surface provides its element here; portaled popups read it and mount in.
// Outside one the context is undefined and popups keep their default <body>
// portal. Nesting resolves to the INNERMOST provider, which is right: a popover
// opened from inside a dialog enters the top layer after it, so it stacks above
// the dialog and is where its popups belong.
export const PortalMountContext =
  createContext<Accessor<HTMLElement | undefined>>();

/**
 * The element portaled popups should mount into (a containing dialog), or
 * undefined.
 */
export const usePortalMount = () => useContext(PortalMountContext);
