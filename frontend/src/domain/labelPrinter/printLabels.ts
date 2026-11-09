import { graphqlFetch } from '../../api/graphql';
import { getLabelPrinterUseUsb } from '../../appData';
import { isAndroid } from '../../platform';
import { LabelPrinterSettings } from './labelPrinter.generated';

// Delivering labels to the store's label printer, for any screen that has
// labels to print. The device's own preference picks the route, so a caller
// passes its endpoint and its payload and never learns which one ran
// (spec/settings/rules.md § Devices — label printer owns the routes and these
// outcomes; a consuming vertical decides only WHAT is printed and WHEN).
//
//   network — POST the payload; the server sends the label to the stored
//             address. Nothing stored is the `not-configured` outcome.
//   USB     — GET the same payload back as print-language text, then hand it
//             to the printer attached to this device, through the vendor's
//             local print service.

/**
 * What came of a print attempt (spec/settings/rules.md § Devices — label
 * printer). `detail` is what the user is shown behind the error disclosure, so
 * it always says something: neither the server endpoint nor the local print
 * service has a structured error shape — the plain-text body IS the message.
 */
export type LabelPrintOutcome =
  | { kind: 'printed' }
  | { kind: 'not-configured' }
  | { kind: 'no-usb-printer' }
  | { kind: 'failed'; detail: string };

/**
 * What a vertical sends its label endpoint: an entry per label where a screen
 * prints several (a prescription's dispensed items), or a single record where
 * it prints one (an asset's QR label). This module only carries it to the
 * endpoint, so it is no narrower than that.
 */
export type LabelPayload = object | readonly object[];

// ---------------------------------------------------------------------------
// Reading an answer
//
// Both routes talk to endpoints that answer the same way: a 2xx, or a non-2xx
// whose plain-text body IS the message. Neither may throw at a caller — a print
// failure reaches nobody but the user who pressed the control, so every path
// resolves something to show.

type Answer = { ok: true; response: Response } | { ok: false; detail: string };

/** A message from whatever was thrown — `.message` is not guaranteed. */
const detailOf = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/**
 * Make one request. A refusal carries its body as the detail, falling back to
 * the status line when the body is empty or unreadable — an empty detail would
 * leave the user's failure report blank.
 */
const request = async (url: string, init?: RequestInit): Promise<Answer> => {
  try {
    const response = await fetch(url, init);
    if (response.ok) return { ok: true, response };
    const body = await response.text().catch(() => '');
    return {
      ok: false,
      detail: body.trim() || `${response.status} ${response.statusText}`.trim(),
    };
  } catch (error) {
    // Transport, not HTTP: the server is unreachable, or nothing is listening
    // on the local service's port.
    return { ok: false, detail: detailOf(error) };
  }
};

/**
 * Read a response's JSON body. Parsing is a failure path of its own — a 200
 * whose body cannot be parsed at all leaves nothing to act on. What the parsed
 * body then contains is each caller's to judge.
 */
const readJson = async <T>(
  response: Response
): Promise<{ ok: true; value: T } | { ok: false; detail: string }> => {
  try {
    return { ok: true, value: (await response.json()) as T };
  } catch (error) {
    return { ok: false, detail: detailOf(error) };
  }
};

// ---------------------------------------------------------------------------
// The USB route
//
// A browser cannot reach a USB device, so the printer vendor's LOCAL PRINT
// SERVICE — installed on the device, listening on loopback — holds the USB
// connection and we drive it over HTTP (spec/settings/contract.md § Devices —
// label printer). The two requests below are the whole surface we use of it.
//
// 127.0.0.1, not `localhost`: the service binds IPv4, and `localhost` can
// resolve to ::1. Loopback is a trustworthy origin, so plain HTTP is reachable
// from an HTTPS page without mixed-content blocking.
const PRINT_SERVICE_URL = 'http://127.0.0.1:9100';

/**
 * A device the local print service can see. `connection` is how it is attached
 * — only `usb` belongs to this route, so a printer the service discovered over
 * the network is listed here and deliberately never used (OMS-REG-SET-05.8).
 */
interface ServiceDevice {
  deviceType: string;
  connection: string;
  uid: string;
  name: string;
  provider?: string;
  manufacturer?: string;
}

/**
 * The device as `/write` expects it — built field by field rather than passing
 * the `/available` entry through, because of `version`.
 *
 * `version` is the API level the CALLER speaks, not the device's. The listing
 * advertises the service's own (observed: 5), and the vendor's client discards
 * that and pins 2 on every device it constructs — matching the `api_level: 2`
 * its ApplicationConfiguration declares. Echoing the listing's number back
 * claims a level we do not speak: the service takes the job, answers `{}` with
 * a 200, and prints nothing.
 */
const writeTarget = (device: ServiceDevice) => ({
  name: device.name,
  uid: device.uid,
  connection: device.connection,
  deviceType: device.deviceType,
  version: 2,
  provider: device.provider,
  manufacturer: device.manufacturer,
});

/**
 * Ask the service what is attached. A listing with no USB printer means attach
 * one; a service we could not reach at all means start it — different fixes,
 * so different outcomes, as the current app also has them.
 */
type Discovery =
  | { kind: 'found'; device: ServiceDevice }
  | { kind: 'none-attached' }
  | { kind: 'unavailable'; detail: string };

const findUsbPrinter = async (): Promise<Discovery> => {
  const discovery = await request(`${PRINT_SERVICE_URL}/available`);
  if (!discovery.ok) return { kind: 'unavailable', detail: discovery.detail };

  const listing = await readJson<{ printer?: ServiceDevice[] }>(
    discovery.response
  );
  // Answered, but not with a listing we can read — still nothing learned about
  // what is attached.
  if (!listing.ok) return { kind: 'unavailable', detail: listing.detail };

  const device = listing.value.printer?.find(
    device => device.connection === 'usb' && device.deviceType === 'printer'
  );
  return device ? { kind: 'found', device } : { kind: 'none-attached' };
};

/**
 * Ask the server to render the labels, which only this route needs: the
 * network route hands the payload over for the server to print itself.
 *
 * A 200 is a success, whatever it carries — the endpoint's answer is
 * authoritative (#855). Printing a prescription with nothing dispensed asks
 * for no labels and so renders no text; that is a print of nothing, not a
 * failure, and both apps let it pass. Only a body we cannot read at all stops
 * the route, because there is then nothing to send.
 */
const labelText = async (
  endpoint: string,
  payload: LabelPayload
): Promise<{ ok: true; zpl: string } | { ok: false; detail: string }> => {
  const data = encodeURIComponent(JSON.stringify(payload));
  const generated = await request(`${endpoint}?data=${data}`, {
    credentials: 'same-origin',
  });
  if (!generated.ok) return generated;

  const body = await readJson<{ zpl?: unknown }>(generated.response);
  if (!body.ok) return body;
  const { zpl } = body.value;
  return { ok: true, zpl: typeof zpl === 'string' ? zpl : '' };
};

const printViaUsb = async (
  endpoint: string,
  payload: LabelPayload
): Promise<LabelPrintOutcome> => {
  // Rendered before looking for a printer, as the current app does, so which
  // failure the user sees when both are wrong does not change.
  const rendered = await labelText(endpoint, payload);
  if (!rendered.ok) return { kind: 'failed', detail: rendered.detail };

  const discovery = await findUsbPrinter();
  if (discovery.kind === 'none-attached') return { kind: 'no-usb-printer' };
  if (discovery.kind === 'unavailable')
    return { kind: 'failed', detail: discovery.detail };

  const sent = await request(`${PRINT_SERVICE_URL}/write`, {
    method: 'POST',
    body: JSON.stringify({
      device: writeTarget(discovery.device),
      data: rendered.zpl,
    }),
  });
  return sent.ok
    ? { kind: 'printed' }
    : { kind: 'failed', detail: sent.detail };
};

// ---------------------------------------------------------------------------
// The network route

const printViaNetwork = async (
  endpoint: string,
  payload: LabelPayload
): Promise<LabelPrintOutcome> => {
  // The client-side gate, so the user gets "configure a printer" rather than
  // the endpoint's raw settings-lookup error. The endpoint reads the stored row
  // itself, so a print can still fail for a missing printer after this answered
  // (spec/settings/contract.md § Devices — label printer, the wire trap).
  //
  // Only a definite "nothing stored" refuses the print: a read we could not
  // make has established nothing, so the endpoint's own answer decides.
  // `background` so that read's failure raises no modal over this print's
  // outcome.
  const settings = await graphqlFetch(
    LabelPrinterSettings,
    {},
    { background: true }
  );
  if (
    settings.kind === 'success' &&
    settings.data.labelPrinterSettings == null
  ) {
    return { kind: 'not-configured' };
  }

  const sent = await request(endpoint, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return sent.ok
    ? { kind: 'printed' }
    : { kind: 'failed', detail: sent.detail };
};

// ---------------------------------------------------------------------------

/**
 * Print `payload` through whichever route this device is set to. Never throws
 * (see "Reading an answer") — the caller reports the outcome on the control
 * that started it (spec/ui-standards/controls.md § action feedback).
 *
 * The Android term guards data, not the platform: 3.1 rendered the USB toggle
 * there, so a tablet can be carrying a stored flag, and 3.2 hides the row it
 * would use to undo it. Nothing can set it on Android from 3.2 on, but the
 * stored value outlives every upgrade. The reference app needs none; its
 * toggle never rendered.
 */
export const printLabels = async (
  endpoint: string,
  payload: LabelPayload
): Promise<LabelPrintOutcome> =>
  !isAndroid() && getLabelPrinterUseUsb()
    ? printViaUsb(endpoint, payload)
    : printViaNetwork(endpoint, payload);
