// The device camera, read by Google's MLKit barcode decoder through
// @capacitor-mlkit/barcode-scanning (the "BarcodeScanner" plugin), in one of
// two ENGINES chosen per device on the Devices screen:
//
//  - 'bundled': the plugin's startScan(), using the MLKit model bundled in
//    the APK (the old shell pins com.google.mlkit:barcode-scanning). Needs no
//    Play services and no internet, which field sites cannot rely on. The price is that the preview is drawn BEHIND the WebView, so the app
//    makes itself transparent and supplies its own scanning UI
//    (../CameraScanOverlay.tsx) while it runs.
//  - 'google': the plugin's scan(), Google Code Scanner — Google's own
//    full-screen UI, from Play services, whose module downloads over the
//    internet on first use. What the old front end uses, and so the default
//    (appData § getCameraEngine): an upgraded device keeps the scanner it
//    already has. 'bundled' is the switch for a device without Play services
//    or a connection.
//
// One scan per press: `continuous` is false, so the wrapper never arms it and
// screens offer a scan button instead of a stay-armed scan. Preference puts it
// last — the camera is what a device scans with when it has nothing else
// (spec/android/behaviours.md § Barcode scanning).
//
// The overlay state lives here as module-level signals, the manual source's
// shape: CameraScanOverlay renders it and calls back by direct call.
//
// The plugin's shape and the pure reading / viewfinder helpers are in
// ./cameraMlkit.ts; the 'google' engine is ./cameraGoogle.ts. This file is
// the bundled engine's scan lifecycle and the source itself.

import { createSignal } from 'solid-js';
import { isAndroid } from '../index';
import { t } from '../../intl';
import { getCameraEngine } from '../../appData';
import { messageOf, type ScanOutcome, type ScanSource } from './source';
import {
  inViewfinder,
  nearestCentre,
  toRawScan,
  type BarcodeScannerPlugin,
  type Detection,
  type ListenerHandle,
  type MlkitBarcode,
  type ViewfinderRect,
} from './cameraMlkit';
import { scanGoogle } from './cameraGoogle';

export { inViewfinder, toRawScan } from './cameraMlkit';
export type { Detection, MlkitBarcode } from './cameraMlkit';

/** The plugin's Resolution enum: 1 is 1280×720, its default; 2 is 1920×1080. */
const RESOLUTION_1080P = 2;
/**
 * A little zoom, so the tablet is held further back — where its camera
 * actually focuses — instead of pushed up close to the label. Clamped to what
 * the camera offers.
 */
const BUNDLED_ZOOM = 1.5;

let plugin: BarcodeScannerPlugin | undefined;
let lastSupported = false;

// Wrapped, never returned bare from an async function: resolving a promise
// with the Capacitor proxy reads its `.then`, which the proxy answers as a
// native method that does not exist — and the outer promise never settles
// (./honeywell.ts hit exactly this).
const getPlugin = async (): Promise<{ p: BarcodeScannerPlugin }> => {
  if (!plugin) {
    const { registerPlugin } = await import('@capacitor/core');
    plugin = registerPlugin<BarcodeScannerPlugin>('BarcodeScanner');
  }
  return { p: plugin };
};

let viewfinder: ViewfinderRect | undefined;

/** The overlay reports where it drew the viewfinder. */
export const setViewfinderRect = (rect: ViewfinderRect | undefined): void => {
  viewfinder = rect;
};

// --- Overlay state (bundled engine) ----------------------------------------

const [overlayOpen, setOverlayOpen] = createSignal(false);
const [torchAvailable, setTorchAvailable] = createSignal(false);
/** Whether the camera overlay is showing — CameraScanOverlay reads it. */
export const cameraOverlayOpen = overlayOpen;
export const cameraTorchAvailable = torchAvailable;

/**
 * Frames the plugin requires a value to match in before it reports it at all
 * (its voteForBarcodes), so the first report already stands on this many.
 */
const PLUGIN_VOTE_FRAMES = 10;
/** A marker is dropped once its code has not been seen for this long. */
const DETECTION_STALE_MS = 400;
/**
 * How long the chosen code stays marked before the overlay closes, so the
 * user sees WHICH code was taken rather than the camera just vanishing.
 */
const CHOSEN_HOLD_MS = 350;

const [detections, setDetections] = createSignal<Detection[]>([]);
/** What the camera is seeing now — CameraScanOverlay draws it. */
export const cameraDetections = detections;

/** The scan in progress: how to settle it, and what to tear down after. */
type Pending = {
  resolve: (outcome: ScanOutcome) => void;
  handles: Promise<ListenerHandle>[];
  /** Frames seen per value, for Detection.frames. */
  frames: Map<string, number>;
  /** A code has been chosen and is being shown; later frames are ignored. */
  chosen: boolean;
  /** Stops this scan's timers. */
  stop: () => void;
};
let pending: Pending | undefined;

/**
 * Settle the scan in progress and put everything back: camera off, listeners
 * gone, app visible again. Safe to call when nothing is pending — every exit
 * path goes through here, because a camera left running behind a transparent
 * app is the one failure this module must never allow.
 */
const finish = async (outcome: ScanOutcome): Promise<void> => {
  const current = pending;
  if (!current) return;
  pending = undefined;
  current.stop();
  setOverlayOpen(false);
  setTorchAvailable(false);
  setDetections([]);
  current.resolve(outcome);
  await Promise.all(
    current.handles.map(h => h.then(x => x.remove()).catch(() => undefined))
  );
  await plugin?.stopScan().catch(() => undefined);
};

/** The user cancelled from the overlay (its button, or hardware back). */
export const cancelCameraScan = (): void => {
  void finish({ ok: false, cancelled: true });
};

/** The overlay's torch button. */
export const toggleCameraTorch = (): void => {
  void plugin?.toggleTorch().catch(() => undefined);
};

/** Ask for the camera, prompting only where Android will still prompt. */
const ensurePermission = async (p: BarcodeScannerPlugin): Promise<boolean> => {
  let { camera } = await p.checkPermissions();
  if (camera === 'prompt' || camera === 'prompt-with-rationale') {
    ({ camera } = await p.requestPermissions());
  }
  return camera === 'granted' || camera === 'limited';
};

// The overlay's transparency has to be painted BEFORE the preview appears
// behind the WebView, or the first frames flash the app over the camera.
const nextFrame = () =>
  new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

/**
 * Show the overlay, then bring the camera up behind it for the scan `mine`.
 * Every check against `pending` is the same question: is this still the scan
 * in progress, or has it been cancelled, or superseded by a newer press?
 */
const startCamera = async (
  p: BarcodeScannerPlugin,
  mine: Pending | undefined
): Promise<void> => {
  setOverlayOpen(true);
  await nextFrame();
  // Cancelled before the camera was even asked for.
  if (pending !== mine) return;
  try {
    // No formats: which barcode shapes a user may scan is never the app's
    // to constrain (spec/barcode-scanning/rules.md § Triggering a scan).
    await p.startScan({ resolution: RESOLUTION_1080P });
    if (pending === mine) {
      const [{ available }, { zoomRatio: maxZoom }] = await Promise.all([
        p.isTorchAvailable().catch(() => ({ available: false })),
        p.getMaxZoomRatio().catch(() => ({ zoomRatio: 1 })),
      ]);
      if (pending !== mine) return;
      setTorchAvailable(available);
      if (maxZoom > 1) {
        await p
          .setZoomRatio({ zoomRatio: Math.min(BUNDLED_ZOOM, maxZoom) })
          .catch(() => undefined);
      }
    } else if (pending === undefined) {
      // Cancelled while the camera was starting: finish() already ran its
      // stopScan, which the camera coming up afterwards has undone. (If a
      // newer press is scanning instead, its own startScan owns the camera —
      // the plugin stops any previous one — so leave it be.)
      await p.stopScan().catch(() => undefined);
    }
  } catch (e) {
    // Only this scan's own failure — a newer press may own `pending` now.
    if (pending === mine) {
      await finish({ ok: false, cancelled: false, message: messageOf(e) });
    }
  }
};

/**
 * One camera frame's report: update the markers, and take the code inside
 * the viewfinder nearest its centre — after holding it on screen for a
 * moment, so the user sees which code was taken.
 */
const onFrame = (mine: Pending, barcodes: MlkitBarcode[]): void => {
  if (pending !== mine) return;
  const ratio =
    typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
  const now = Date.now();
  const seen: Detection[] = barcodes
    .filter(b => b.rawValue !== '')
    .map(b => {
      const frames = (mine.frames.get(b.rawValue) ?? 0) + 1;
      mine.frames.set(b.rawValue, frames);
      return {
        value: b.rawValue,
        format: b.format,
        points: (b.cornerPoints ?? []).map(
          ([x, y]) => [x / ratio, y / ratio] as [number, number]
        ),
        inside: inViewfinder(b, viewfinder, ratio),
        // The plugin's own vote came first (see PLUGIN_VOTE_FRAMES).
        frames: frames + PLUGIN_VOTE_FRAMES - 1,
        chosen: false,
        seenAt: now,
      };
    });
  if (mine.chosen) return;
  const aimed = nearestCentre(
    seen.filter(d => d.inside),
    viewfinder
  );
  setDetections(prev => [
    ...seen.map(d => (d === aimed ? { ...d, chosen: true } : d)),
    ...prev.filter(
      d =>
        now - d.seenAt < DETECTION_STALE_MS &&
        !seen.some(s => s.value === d.value)
    ),
  ]);
  if (!aimed) return;
  mine.chosen = true;
  const barcode = barcodes.find(b => b.rawValue === aimed.value);
  if (!barcode) return;
  const scan = toRawScan(barcode, 'bundled');
  const hold = setTimeout(() => {
    if (pending === mine) void finish({ ok: true, scan });
  }, CHOSEN_HOLD_MS);
  const stopPruning = mine.stop;
  mine.stop = () => {
    stopPruning();
    clearTimeout(hold);
  };
};

const scanBundled = (p: BarcodeScannerPlugin): Promise<ScanOutcome> => {
  // Markers for codes that left the frame have to go even when no further
  // frame arrives to replace them (MLKit reports nothing for an empty frame).
  const pruner = setInterval(() => {
    const now = Date.now();
    setDetections(prev =>
      prev.some(d => !d.chosen && now - d.seenAt >= DETECTION_STALE_MS)
        ? prev.filter(d => d.chosen || now - d.seenAt < DETECTION_STALE_MS)
        : prev
    );
  }, DETECTION_STALE_MS / 2);

  const mine: Pending = {
    resolve: () => undefined,
    handles: [],
    frames: new Map(),
    chosen: false,
    stop: () => clearInterval(pruner),
  };
  const outcome = new Promise<ScanOutcome>(resolve => {
    mine.resolve = resolve;
  });
  pending = mine;
  mine.handles.push(
    // The model reports every frame it finds a code in (once the plugin's
    // vote is met); onFrame decides which one is the scan.
    p.addListener('barcodesScanned', ({ barcodes }) => onFrame(mine, barcodes)),
    p.addListener('scanError', ({ message }) => {
      if (pending === mine) {
        void finish({ ok: false, cancelled: false, message });
      }
    })
  );
  // Returned at once, not after the camera starts: a cancel while it is
  // still starting has to reach the caller, and a camera that never comes
  // up must not leave the caller waiting on it.
  void startCamera(p, mine);
  return outcome;
};

// --- The source ------------------------------------------------------------

export const cameraSource: ScanSource = {
  id: 'camera',
  displayName: () => t('label.barcode-scanner-camera'),
  continuous: false,

  available: async () => {
    if (!isAndroid()) return false;
    try {
      // Rejects on a shell without the plugin (the new shell, today).
      const { supported } = await (await getPlugin()).p.isSupported();
      lastSupported = supported;
      return supported;
    } catch {
      lastSupported = false;
      return false;
    }
  },
  connected: () => lastSupported,

  scanOnce: async () => {
    // A second press supersedes the first rather than queueing behind it.
    await finish({ ok: false, cancelled: true });

    let p: BarcodeScannerPlugin;
    try {
      ({ p } = await getPlugin());
      if (!(await ensurePermission(p))) {
        return {
          ok: false,
          cancelled: false,
          message: t('error.camera-permission-denied'),
        };
      }
    } catch (e) {
      return { ok: false, cancelled: false, message: messageOf(e) };
    }

    // Re-read per scan rather than snapshotted, so switching engine on the
    // Devices screen takes effect on the next press.
    return getCameraEngine() === 'google' ? scanGoogle(p) : scanBundled(p);
  },

  listen: async () => ({
    ok: false,
    message: 'the camera scans one barcode per press',
  }),

  // Leaving a screen cancels a bundled scan in progress. (Google's scanner
  // is a separate activity over the app, closed by the user or by it.)
  release: async () => {
    await finish({ ok: false, cancelled: true });
  },
};

/** Forget all module state. Tests only. */
export const resetCameraForTest = (): void => {
  plugin = undefined;
  lastSupported = false;
  pending?.stop();
  pending = undefined;
  viewfinder = undefined;
  setDetections([]);
  setOverlayOpen(false);
  setTorchAvailable(false);
};
