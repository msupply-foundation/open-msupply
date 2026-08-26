import { createMemo, mergeProps, Show } from 'solid-js';
import { Popover } from '../feedback/Popover';
import { t } from '../../../intl';
import { QrCode as QrEncoder, QrEcc } from './qr/qrEncoder';

interface QrCodeProps {
  /** The text/URL to encode (byte mode, UTF-8). */
  value: string;
  /**
   * Inline (trigger) side length. Number → px; string → any CSS length.
   * Default 50.
   */
  size?: number | string;
  /** Side length of the enlarged copy popped on click. Default 256. */
  expandedSize?: number | string;
  /** Error correction level. Default Low (react-qr-code's default). */
  ecc?: QrEcc;
  /**
   * Light modules per side of the quiet-zone border. Default 0, per
   * react-qr-code.
   */
  margin?: number;
  /**
   * Accessible name for the enlarged symbol; omitted → decorative
   * (aria-hidden).
   */
  title?: string;
  /**
   * Accessible name for the click-to-expand trigger. Default
   * t('messages.click-to-expand').
   */
  expandLabel?: string;
  /** `data-testid` for the inline trigger (e2e/TESTIDS.md). */
  triggerTestId?: string;
  /** `data-testid` for the enlarged copy shown after click (e2e/TESTIDS.md). */
  expandedTestId?: string;
}

const cssLength = (v: number | string) =>
  typeof v === 'number' ? `${v}px` : v;

/*
 * QR code — a Solid analogue of the reference app's `react-qr-code` usage. The
 * inline symbol is click-to-expand (it pops an enlarged copy for scanning /
 * pairing): the ONLY way a QR is used in the reference app (Admin/ServerInfo),
 * so expand is the element's behaviour, not an opt-in — a static QR has no
 * consumer to justify the API (add it back if a print/report context ever
 * needs one).
 *
 * Each symbol is a self-contained SVG: dark modules drawn as one `<path>` of
 * rects over a full-size light background, scaling crisply to any size and
 * taking colours from the theme-invariant `--qr-foreground`/`--qr-background`
 * tokens (a QR stays dark-on-light in both themes for scannability). Encoding
 * is memoised on `value`/
 * `ecc` and computed once, then shared by the inline trigger and the enlarged
 * copy. See qr/qrEncoder.ts for why we vendor the encoder over a dependency.
 */
export const QrCode = (props: QrCodeProps) => {
  const merged = mergeProps(
    { size: 50, ecc: QrEcc.Low, margin: 0, expandedSize: 256 },
    props
  );

  const matrix = createMemo(() =>
    QrEncoder.encodeText(merged.value, merged.ecc)
  );

  // One SVG path covering every dark module (1 unit each), plus the drawing's
  // total side length in module units — both independent of render `size`.
  const path = createMemo(() => {
    const qr = matrix();
    const parts: string[] = [];
    for (let y = 0; y < qr.size; y++)
      for (let x = 0; x < qr.size; x++)
        if (qr.getModule(x, y))
          parts.push(`M${x + merged.margin},${y + merged.margin}h1v1h-1z`);
    return parts.join('');
  });
  const dimension = createMemo(() => matrix().size + merged.margin * 2);

  // A presentational symbol at a given rendered side length. `label` names it
  // (role="img"); omit for a decorative graphic (aria-hidden).
  const symbol = (size: number | string, label?: string, testId?: string) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={cssLength(size)}
      height={cssLength(size)}
      viewBox={`0 0 ${dimension()} ${dimension()}`}
      shape-rendering="crispEdges"
      role={label ? 'img' : undefined}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      data-testid={testId}
    >
      <Show when={label}>
        <title>{label}</title>
      </Show>
      <rect
        width={dimension()}
        height={dimension()}
        fill="var(--qr-background)"
      />
      <path d={path()} fill="var(--qr-foreground)" />
    </svg>
  );

  return (
    <Popover
      trigger={symbol(merged.size)}
      triggerLabel={merged.expandLabel ?? t('messages.click-to-expand')}
      triggerTestId={props.triggerTestId}
      placement="bottom"
    >
      {symbol(merged.expandedSize, props.title, props.expandedTestId)}
    </Popover>
  );
};
