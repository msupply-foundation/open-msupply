// Kobalte's DismissableLayer (Select/Combobox Content) fires
// `onInteractOutside` on a pointerdown it judges to be outside the popup. When
// the popup is portal-mounted INTO a native <dialog> (so it isn't inert /
// behind the top layer — see utils/portalMount), a pointerdown on an option is
// mis-detected as "outside", which dismisses the listbox before the click
// commits — mouse selection silently fails while keyboard still works (keyboard
// fires no pointer event). This is the documented portal-in-dialog interaction
// bug.
//
// The fix (confirmed pattern): let the layer keep open when the interaction is
// actually inside the mount element (the dialog), while a genuine click OUTSIDE
// the dialog still dismisses. Shared by Select + Combobox.

// Kobalte's InteractOutsideEvent, minimally typed to what we read (it's a
// CustomEvent<{ originalEvent: PointerEvent | FocusEvent }>). Kept local to
// avoid depending on Kobalte's non-public type export path.
export type InteractOutsideEvent = {
  detail: { originalEvent: { target: EventTarget | null } };
  preventDefault: () => void;
};

// Prevent the dismiss when the interaction's real target is within `mount`
// (the dialog the popup is mounted into). No-op when there's no mount (popup
// portaled to <body> as usual).
export const keepDialogOpenOnInside =
  (mount: HTMLElement | undefined) => (event: InteractOutsideEvent) => {
    const target = event.detail.originalEvent.target;
    if (mount && target instanceof Node && mount.contains(target))
      event.preventDefault();
  };
