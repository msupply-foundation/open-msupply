// Kobalte's DismissableLayer (Select/Combobox Content) fires `onInteractOutside`
// for an interaction it judges to be outside the popup — on a pointerdown, but
// ALSO on a focus change. When the popup is portal-mounted INTO a native
// <dialog> (so it isn't inert / behind the top layer — see utils/portalMount),
// clicking an option is mis-reported as outside via that FOCUS path:
//
//   pointerdown on the <li> option  → target is inside the content → NOT outside
//   → but the option isn't focusable, so focus bounces off the input up to the
//     <dialog>, and Kobalte reports focusout/focusin with target = the DIALOG
//   → that dialog is an ANCESTOR of the content, so it reads as "outside" and
//     dismisses the listbox between mousedown and pointerup — the click never
//     lands on the option and selection silently fails (keyboard still works;
//     it fires no focus-to-dialog bounce).
//
// So the interaction to suppress is a focus bounce onto a CONTAINER of the
// popup (the dialog it lives in), which shares the content's ancestor axis. A
// genuine click-off — another field, blank dialog space, outside — targets a
// SIBLING subtree instead, and must still dismiss.
//
// The earlier guard suppressed dismissal for anything inside the whole mount
// (the dialog), which was too broad: clicking off a combobox (or onto a sibling
// one in an editable table) never closed it, so you could pile several open at
// once. Scoping to the content's own ancestor↔descendant axis fixes both the
// option-click bug and the never-closes bug. Shared by Select + Combobox.

// Kobalte's InteractOutsideEvent, minimally typed to what we read (it's a
// CustomEvent<{ originalEvent: PointerEvent | FocusEvent }>). Kept local to
// avoid depending on Kobalte's non-public type export path.
export type InteractOutsideEvent = {
  detail: { originalEvent: { target: EventTarget | null } };
  preventDefault: () => void;
};

// Prevent the dismiss only when the interaction's target is on the popup's own
// ancestor↔descendant axis: inside the content (`content.contains`), or a
// container that WRAPS it (`target.contains(content)` — the dialog the popup is
// portaled into, which focus bounces to on an option click). Anything in a
// sibling subtree — another field, blank space, a genuine outside click —
// dismisses as normal. `getContent` is read lazily since the ref is set after
// the content mounts.
export const keepPopupOpenOnInsideContent =
  (getContent: () => HTMLElement | undefined) =>
  (event: InteractOutsideEvent) => {
    const target = event.detail.originalEvent.target;
    const content = getContent();
    if (!content || !(target instanceof Node)) return;
    if (content.contains(target) || target.contains(content))
      event.preventDefault();
  };
