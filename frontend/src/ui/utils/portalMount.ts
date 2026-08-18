import { createContext, useContext, type Accessor } from 'solid-js';

// Where a portaled popup (Select / Combobox listbox, etc.) should mount.
//
// The TOP LAYER is the reason this exists: it paints above every normal-flow
// element whatever its z-index, so a popup portaled to <body> from inside a
// top-layer surface is drawn behind it and takes no clicks — the hit test lands
// on the surface covering it. Mounting INSIDE shares that top-layer box. Two
// surfaces put us there: a modal <dialog> (which also makes everything outside
// it `inert`), and a native popover panel (where mounting inside additionally
// keeps an option click "inside", so light dismiss doesn't fire — #1107).
// Neither may clip the popup, so both scroll on an inner body, not on the box
// that is the mount.
//
// The surface provides its element here; popups read it and mount in. Outside
// one the context is undefined and they keep their <body> portal. Nesting takes
// the innermost, which is right: a popover opened from a dialog enters the top
// layer after it, so it stacks above.
export const PortalMountContext =
  createContext<Accessor<HTMLElement | undefined>>();

/**
 * The element portaled popups should mount into (a containing dialog or popover
 * panel), or undefined.
 */
export const usePortalMount = () => useContext(PortalMountContext);
