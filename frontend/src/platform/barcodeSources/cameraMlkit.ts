// What the camera source reads through: the MLKit plugin's shape, and the
// pure helpers that turn what it reports into the layer's reads — the raw
// value as a RawScan, and where on screen a code sits relative to the
// viewfinder. Split from ./camera.ts so the geometry can be read (and tested)
// without the scan lifecycle around it.

import type { CameraEngine } from '../../appData';
import type { RawScan } from './source';

type CameraPermission =
  'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' | 'limited';

/** A read, as the plugin reports it — only the fields used here. */
export type MlkitBarcode = {
  rawValue: string;
  format: string;
  /** Screen position, in PHYSICAL pixels — bundled engine only. */
  cornerPoints?: [number, number][];
};

export type ListenerHandle = { remove: () => Promise<void> };

export type BarcodeScannerPlugin = {
  isSupported: () => Promise<{ supported: boolean }>;
  checkPermissions: () => Promise<{ camera: CameraPermission }>;
  requestPermissions: () => Promise<{ camera: CameraPermission }>;
  startScan: (options?: { resolution?: number }) => Promise<void>;
  stopScan: () => Promise<void>;
  isTorchAvailable: () => Promise<{ available: boolean }>;
  toggleTorch: () => Promise<void>;
  getMaxZoomRatio: () => Promise<{ zoomRatio: number }>;
  setZoomRatio: (options: { zoomRatio: number }) => Promise<void>;
  scan: (options?: { autoZoom?: boolean }) => Promise<{
    barcodes: MlkitBarcode[];
  }>;
  isGoogleBarcodeScannerModuleAvailable: () => Promise<{ available: boolean }>;
  installGoogleBarcodeScannerModule: () => Promise<void>;
  addListener(
    event: 'barcodesScanned',
    handler: (event: { barcodes: MlkitBarcode[] }) => void
  ): Promise<ListenerHandle>;
  addListener(
    event: 'scanError',
    handler: (event: { message: string }) => void
  ): Promise<ListenerHandle>;
  addListener(
    event: 'googleBarcodeScannerModuleInstallProgress',
    handler: (event: { state: number; progress?: number }) => void
  ): Promise<ListenerHandle>;
};

// --- Reading what MLKit reports --------------------------------------------

/**
 * Convert a plugin read to the layer's shape — verbatim. MLKit marks a GS1
 * symbol inside the text, and not consistently: a leading field separator
 * for a GS1 DataMatrix, a literal "]C1" for GS1-128 (captured 2026-09-23,
 * bundled engine). Making those read the same as the Honeywell's
 * out-of-band identifier is interpretation, and belongs to the reading
 * layer (src/domain/barcode/readScan.ts), which handles both. Exported for
 * tests.
 */
export const toRawScan = (
  barcode: MlkitBarcode,
  engine: CameraEngine
): RawScan => {
  const decoder =
    engine === 'google' ? 'MLKit (Google Code Scanner)' : 'MLKit (bundled)';
  return {
    kind: 'text',
    text: barcode.rawValue,
    ...(barcode.format ? { format: barcode.format } : {}),
    decoder,
  };
};

/** Where the viewfinder is on screen, in CSS pixels. */
export type ViewfinderRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

/**
 * Is this barcode the one being aimed at? MLKit reads the WHOLE frame and
 * would otherwise hand over whichever code on the box it happened to find
 * first. Its centre has to fall inside the viewfinder — with some slack,
 * because the preview and the page are mapped onto each other only
 * approximately (physical pixels to CSS pixels). A read with no position, or
 * with no viewfinder drawn, is accepted: filtering is a help, not a gate.
 * Exported for tests.
 */
export const inViewfinder = (
  barcode: MlkitBarcode,
  rect: ViewfinderRect | undefined,
  devicePixelRatio: number
): boolean => {
  const points = barcode.cornerPoints;
  if (!rect || !points || points.length === 0) return true;
  const x =
    points.reduce((sum, [px]) => sum + px, 0) /
    points.length /
    devicePixelRatio;
  const y =
    points.reduce((sum, [, py]) => sum + py, 0) /
    points.length /
    devicePixelRatio;
  const slackX = (rect.right - rect.left) * 0.15;
  const slackY = (rect.bottom - rect.top) * 0.15;
  return (
    x >= rect.left - slackX &&
    x <= rect.right + slackX &&
    y >= rect.top - slackY &&
    y <= rect.bottom + slackY
  );
};

/**
 * One code the camera is seeing, for the overlay's markers — so a user can
 * tell which codes are being detected, which one would be taken, and why a
 * code in plain sight is being passed over.
 */
export type Detection = {
  value: string;
  format: string;
  /** Outline on screen, in CSS pixels (the overlay's own coordinates). */
  points: [number, number][];
  /** Centre inside the viewfinder (with its slack) — i.e. eligible. */
  inside: boolean;
  /**
   * Frames this exact value has been read in, this scan. MLKit gives no
   * confidence score; agreement across frames is the nearest honest thing.
   * The plugin reports a code only once it has matched in
   * PLUGIN_VOTE_FRAMES (./camera.ts) frames, so a code on screen has at
   * least that many.
   */
  frames: number;
  /** The one taken as the scan. */
  chosen: boolean;
  /** When it was last seen — markers fade out once a code leaves view. */
  seenAt: number;
};

/**
 * Of the codes inside the viewfinder, the one nearest its centre — so when
 * two codes fit in the box (the tin's DataMatrix beside its EAN-13), the one
 * being aimed at wins, not whichever MLKit happened to list first. Without a
 * viewfinder or positions there is nothing to measure, so the first stands.
 */
export const nearestCentre = (
  candidates: Detection[],
  rect: ViewfinderRect | undefined
): Detection | undefined => {
  if (!rect) return candidates[0];
  const cx = (rect.left + rect.right) / 2;
  const cy = (rect.top + rect.bottom) / 2;
  const distance = (d: Detection) => {
    if (d.points.length === 0) return Infinity;
    const x = d.points.reduce((sum, [px]) => sum + px, 0) / d.points.length;
    const y = d.points.reduce((sum, [, py]) => sum + py, 0) / d.points.length;
    return Math.hypot(x - cx, y - cy);
  };
  return candidates.reduce<Detection | undefined>(
    (best, d) =>
      best === undefined || distance(d) < distance(best) ? d : best,
    undefined
  );
};
