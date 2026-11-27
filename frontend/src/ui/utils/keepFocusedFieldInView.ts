import { isTextEntry } from './isTextEntry';

/*
 * When the visible area gets SHORTER while a text field holds focus, scroll
 * that field back into view.
 *
 * On a tablet the on-screen keyboard comes up as a field takes focus, and the
 * page shrinks to the space above it. That shrink is the Android shell's job,
 * done there for every page any server serves (#2161, #2352): the WebView is
 * resized above the keyboard on every Android version. Chromium then scrolls the
 * field into what is left — but only when the user TAPPED THE FIELD itself.
 * Focus that arrives any other way gets no such help: tapping a Combobox's
 * chevron (the picker focuses its own input, and the keyboard follows), a dialog
 * opening on a field, Tab from a hardware keyboard. The field is left below the
 * fold, under the keyboard, and anything anchored to it — the picker's list — is
 * placed against a field the user cannot see (#2593).
 *
 * So this does not move anything by the keyboard's height: the shell already
 * gave the room, and lifting the page again on top of it is the double lift
 * #2352 removed. It only brings the focused field into the room the shell gave.
 *
 * The visual viewport, not the window, because that is the box a keyboard
 * shrinks in every engine; Chromium resizes the window too, Safari does not.
 * (Checked on Android's WebView only: whether `scrollIntoView` reaches a field
 * Safari's keyboard hides, where its layout viewport stays full height, is
 * untested.) `block: 'nearest'` moves the fewest boxes the least distance, so a
 * field already on screen does not move at all — nothing changes for the tapped
 * case or for a desktop window being resized. It scrolls every scrollable
 * ancestor (a dialog's scroll region, then the page), which a popup positioned
 * by Floating UI follows, as it re-places on ancestor scroll. Growth is
 * ignored: the keyboard going away gives room back and moves nothing out of
 * view.
 *
 * A pinch zoom shrinks the visual viewport too, a step at a time. It changes
 * the SCALE as it does, and a keyboard never does, so a resize that changed the
 * scale is the user zooming, and is left alone — otherwise every step of a
 * pinch would snap the view back to the focused field, and nothing else could
 * be zoomed in on while a field held focus.
 *
 * Started once for the app (App.tsx); returns its stop.
 */
export const startKeepingFocusedFieldInView = (
  win: Window = window
): (() => void) => {
  const viewport = win.visualViewport;
  // No visual viewport (an old engine): nothing to watch.
  if (!viewport) return () => {};

  let lastHeight = viewport.height;
  let lastScale = viewport.scale;
  let frame: number | undefined;

  const onResize = () => {
    const { height, scale } = viewport;
    const shrank = height < lastHeight && scale === lastScale;
    lastHeight = height;
    lastScale = scale;
    if (!shrank) return;
    // After layout settles at the new size, so the field's box is final.
    if (frame !== undefined) win.cancelAnimationFrame(frame);
    frame = win.requestAnimationFrame(() => {
      frame = undefined;
      const field = win.document.activeElement;
      if (field && isTextEntry(field)) {
        field.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    });
  };

  viewport.addEventListener('resize', onResize);
  return () => {
    viewport.removeEventListener('resize', onResize);
    if (frame !== undefined) win.cancelAnimationFrame(frame);
  };
};
