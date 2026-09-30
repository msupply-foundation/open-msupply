import { createEffect, Index, onCleanup, Show } from 'solid-js';
import { Button } from '../ui/elements/buttons/Button';
import { CloseIcon, ZapIcon } from '../ui/icons';
import { t } from '../intl';
import {
  cameraDetections,
  cameraOverlayOpen,
  cameraTorchAvailable,
  cameraTorchOn,
  cancelCameraScan,
  setViewfinderRect,
  toggleCameraTorch,
} from './barcodeSources/camera';
import styles from './CameraScanOverlay.module.css';

/** Long codes shortened for a marker label; the scan itself is untouched. */
const abbreviate = (value: string): string => {
  const visible = value.replaceAll('\u001d', '␝');
  return visible.length > 18 ? `${visible.slice(0, 16)}…` : visible;
};

// The app's side of a camera scan (./barcodeSources/camera.ts). The bundled
// MLKit scanner draws its preview BEHIND the WebView, so while a scan runs
// the app has to get out of the way: every surface it paints is made
// transparent or hidden (the `data-camera-scanning` rules in the stylesheet),
// and this overlay is all that is left on top of the camera image — a
// viewfinder, a hint, cancel, and the torch where there is one.
//
// Mounted ONCE, app-wide, in App.tsx, like ManualScanInput: a scan can start
// from any screen, including inside an open dialog. Renders nothing unless a
// camera scan is running.
export const CameraScanOverlay = () => {
  let panel: HTMLDivElement | undefined;
  let viewfinder: HTMLDivElement | undefined;
  let cancelButton: HTMLButtonElement | undefined;

  // The source only accepts a code whose centre is inside the viewfinder, so
  // it has to know where the viewfinder is — re-measured whenever the screen
  // changes shape (rotation), and forgotten when the overlay closes.
  const measure = () => {
    const rect = viewfinder?.getBoundingClientRect();
    setViewfinderRect(
      rect && rect.width > 0
        ? {
            left: rect.left,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
          }
        : undefined
    );
  };
  window.addEventListener('resize', measure);
  onCleanup(() => window.removeEventListener('resize', measure));

  // The top layer is entered by showPopover(), not by CSS — and it has to be,
  // to sit above a <dialog> that is already open (the field-level scan
  // button lives in edit modals). Both calls throw if already in that state.
  createEffect(() => {
    const open = cameraOverlayOpen();
    document.documentElement.toggleAttribute('data-camera-scanning', open);
    if (!panel) return;
    try {
      if (open) panel.showPopover();
      else panel.hidePopover();
    } catch {
      /* already in that state */
    }
    // After the <Show> below has rendered the viewfinder. Focus goes to
    // Cancel, the one way out, so a keyboard or switch user is not left on
    // a control the hidden app still holds.
    if (open)
      requestAnimationFrame(() => {
        measure();
        cancelButton?.focus();
      });
    else setViewfinderRect(undefined);
  });

  return (
    <div
      ref={panel}
      popover="manual"
      class={styles.overlay}
      role="dialog"
      aria-label={t('label.barcode-scanner-camera')}
      data-testid="camera-scan-overlay"
    >
      <Show when={cameraOverlayOpen()}>
        {/* What the camera is seeing, drawn where it sees it — above the
            viewfinder's dimmed surround, so an ignored code is still
            visible, and never in the way of a tap. */}
        <svg class={styles.marks} aria-hidden="true">
          <Index each={cameraDetections()}>
            {detection => (
              <g
                class={styles.mark}
                data-state={
                  detection().chosen
                    ? 'chosen'
                    : detection().inside
                      ? 'eligible'
                      : 'ignored'
                }
              >
                <polygon
                  points={detection()
                    .points.map(([x, y]) => `${x},${y}`)
                    .join(' ')}
                />
                {/* The value, format and frame count are for whoever is
                    tuning the decoder — never shipped to users. */}
                <Show
                  when={import.meta.env.DEV && detection().points.length > 0}
                >
                  <text
                    x={Math.min(...detection().points.map(([x]) => x))}
                    y={Math.min(...detection().points.map(([, y]) => y)) - 8}
                  >
                    {`${detection().chosen ? '✓ ' : ''}${abbreviate(
                      detection().value
                    )} · ${detection().format} · ${t(
                      'messages.camera-mark-frames',
                      { count: String(detection().frames) }
                    )}`}
                  </text>
                </Show>
              </g>
            )}
          </Index>
        </svg>
        <div class={styles.top}>
          <p class={styles.hint}>{t('messages.camera-scan-hint')}</p>
          <Show when={import.meta.env.DEV}>
            <p class={styles.legend}>{t('messages.camera-scan-legend')}</p>
          </Show>
        </div>
        <div ref={viewfinder} class={styles.viewfinder} aria-hidden="true" />
        <div class={styles.actions}>
          <Show when={cameraTorchAvailable()}>
            <Button
              variant="secondary"
              icon={<ZapIcon />}
              aria-pressed={cameraTorchOn()}
              onClick={toggleCameraTorch}
              data-testid="camera-scan-torch"
            >
              {t('button.torch')}
            </Button>
          </Show>
          <Button
            variant="secondary"
            icon={<CloseIcon />}
            ref={cancelButton}
            onClick={cancelCameraScan}
            data-testid="camera-scan-cancel"
          >
            {t('button.cancel')}
          </Button>
        </div>
      </Show>
    </div>
  );
};
