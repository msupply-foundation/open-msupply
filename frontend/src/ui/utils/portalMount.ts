import { createContext, useContext, type Accessor } from 'solid-js';

// Where a portaled popup (Select / Combobox listbox, etc.) should mount.
//
// A native <dialog> opened with showModal() puts everything OUTSIDE it into the `inert`
// state (and the dialog into the top layer). A popup portaled to <body> is therefore both
// (a) painted behind the top-layer dialog and (b) inert — so it can't be clicked/selected.
// Mounting the popup INSIDE the dialog fixes both: it's part of the dialog's content, so
// it's not inert and stacks with it. (The dialog's own `overflow` must not clip it — see
// Dialog.module.css, which clips on the inner body, not the dialog box.)
//
// A dialog provides its element here; portaled popups read it and mount in. Outside a
// dialog the context is undefined and popups keep their default <body> portal.
export const PortalMountContext = createContext<Accessor<HTMLElement | undefined>>();

/** The element portaled popups should mount into (a containing dialog), or undefined. */
export const usePortalMount = () => useContext(PortalMountContext);
