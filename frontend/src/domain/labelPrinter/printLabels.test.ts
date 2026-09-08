import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { printLabels } from './printLabels';

// Label delivery over both routes (OMS-REG-SET-05.8, .42, .43).
//
// One subject per describe, and each fact asserted in exactly one of them: the
// route choice, then each route's own requests. No printer and no print service
// are needed — what each would answer is what is stubbed here, and the
// no-service case IS a rejected fetch.
const getLabelPrinterUseUsb = vi.hoisted(() => vi.fn());
vi.mock('../../appData', () => ({ getLabelPrinterUseUsb }));

const graphqlFetch = vi.hoisted(() => vi.fn());
vi.mock('../../api/graphql', () => ({ graphqlFetch }));

const ENDPOINT = '/print/label-prescription';
const PRINT_SERVICE = 'http://127.0.0.1:9100';
const labels = [{ itemDetails: '21 tablet Aspirin' }];
// A vertical that prints ONE label sends a bare record, not a list of one
// (an asset's QR label) — this module carries either shape unchanged.
const assetLabel = { code: 'FRIDGE-1', assetNumber: 'A0042' };

// Verbatim entries from a real `/available`, a ZD220 attached by USB — not a
// shape invented here. `version` matters: the service advertises its OWN level
// (5), and a caller must claim the level it speaks (2). A trimmed fixture would
// let a straight pass-through of the listing pass this file.
const usbPrinter = {
  deviceType: 'printer',
  uid: 'usb#vid_0a5f&pid_0164#D4J262002123#bus_002#addr_009#model_ZTC ZD220-203dpi ZPL',
  provider: 'com.zebra.ds.webdriver.desktop.provider.DefaultDeviceProvider',
  name: 'ZD220-203dpi ZPL (D4J262002123)',
  connection: 'usb',
  version: 5,
  manufacturer: 'Zebra Technologies',
};
const networkPrinter = {
  deviceType: 'printer',
  uid: '192.168.1.224',
  provider: 'com.zebra.ds.webdriver.desktop.provider.DefaultDeviceProvider',
  name: 'Wired (192.168.1.224)',
  connection: 'network',
  version: 5,
  manufacturer: 'Zebra Technologies',
};

/** Every request gets the same answer. */
const alwaysRespond = (response: Response) => {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

/**
 * The USB route's requests, in the order it makes them: the label text from
 * our endpoint, the service's device listing, then the send.
 */
const usbRouteAnswers = (answers: {
  labelText?: Response;
  listing?: Response;
  send?: Response;
}) => {
  const fetchMock = vi.fn();
  fetchMock.mockResolvedValueOnce(
    answers.labelText ?? new Response('{"zpl":"^XA^XZ"}')
  );
  if (answers.listing) fetchMock.mockResolvedValueOnce(answers.listing);
  if (answers.send) fetchMock.mockResolvedValueOnce(answers.send);
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const devices = (printer: unknown[]) =>
  new Response(JSON.stringify({ printer }));

const printerConfigured = () =>
  graphqlFetch.mockResolvedValue({
    kind: 'success',
    data: { labelPrinterSettings: { address: '192.168.1.224', port: 9100 } },
  });

beforeEach(() => {
  getLabelPrinterUseUsb.mockReset();
  graphqlFetch.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the route is the device’s choice', () => {
  it('takes the USB route with the preference on, reading no printer settings', async () => {
    getLabelPrinterUseUsb.mockReturnValue(true);
    usbRouteAnswers({
      listing: devices([usbPrinter]),
      send: new Response(''),
    });

    expect(await printLabels(ENDPOINT, labels)).toEqual({ kind: 'printed' });
    // OMS-REG-SET-05.8 — the stored network settings are never consulted.
    expect(graphqlFetch).not.toHaveBeenCalled();
  });

  it('takes the network route with the preference off', async () => {
    getLabelPrinterUseUsb.mockReturnValue(false);
    printerConfigured();
    const fetchMock = alwaysRespond(new Response('Label printed'));

    expect(await printLabels(ENDPOINT, labels)).toEqual({ kind: 'printed' });
    expect(graphqlFetch).toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1); // the endpoint, nothing local
  });
});

describe('the network route', () => {
  beforeEach(() => {
    getLabelPrinterUseUsb.mockReturnValue(false);
  });

  it('POSTs the labels as JSON', async () => {
    printerConfigured();
    const fetchMock = alwaysRespond(new Response('Label printed'));

    await printLabels(ENDPOINT, labels);

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ENDPOINT);
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(String(init.body))).toEqual(labels);
  });

  it('POSTs a single-record payload as itself, not wrapped in a list', async () => {
    printerConfigured();
    const fetchMock = alwaysRespond(new Response('Label printed'));

    await printLabels(ENDPOINT, assetLabel);

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual(assetLabel);
  });

  it.each([
    [
      'nothing is stored',
      { kind: 'success', data: { labelPrinterSettings: null } },
    ],
    ['the settings cannot be read', { kind: 'error' }],
  ])(
    'reports not-configured and prints nothing when %s',
    async (_case, answer) => {
      graphqlFetch.mockResolvedValue(answer);
      const fetchMock = alwaysRespond(new Response('Label printed'));

      expect(await printLabels(ENDPOINT, labels)).toEqual({
        kind: 'not-configured',
      });
      expect(fetchMock).not.toHaveBeenCalled();
    }
  );

  it("carries the server's refusal as the failure detail", async () => {
    printerConfigured();
    alwaysRespond(
      new Response(
        'Error getting printer settings: DBError { msg: "No label printer settings found" }',
        { status: 500 }
      )
    );

    expect(await printLabels(ENDPOINT, labels)).toEqual({
      kind: 'failed',
      detail:
        'Error getting printer settings: DBError { msg: "No label printer settings found" }',
    });
  });

  it('falls back to the status line when the refusal says nothing', async () => {
    printerConfigured();
    alwaysRespond(
      new Response('', { status: 500, statusText: 'Internal Server Error' })
    );

    expect(await printLabels(ENDPOINT, labels)).toEqual({
      kind: 'failed',
      detail: '500 Internal Server Error',
    });
  });

  it.each([
    ['a transport failure', new Error('Failed to fetch'), 'Failed to fetch'],
    ['what was thrown is not an Error', 'printer exploded', 'printer exploded'],
  ])('reports %s rather than throwing', async (_case, thrown, detail) => {
    printerConfigured();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(thrown));

    expect(await printLabels(ENDPOINT, labels)).toEqual({
      kind: 'failed',
      detail,
    });
  });
});

describe('the USB route', () => {
  beforeEach(() => {
    getLabelPrinterUseUsb.mockReturnValue(true);
  });

  it('sends the label text to the USB printer the service lists', async () => {
    const fetchMock = usbRouteAnswers({
      labelText: new Response('{"zpl":"^XA^FDlabel^FS^XZ"}'),
      listing: devices([networkPrinter, usbPrinter]),
      send: new Response(''),
    });

    expect(await printLabels(ENDPOINT, labels)).toEqual({ kind: 'printed' });

    const [textUrl, textInit] = fetchMock.mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(textUrl).toBe(
      `${ENDPOINT}?data=${encodeURIComponent(JSON.stringify(labels))}`
    );
    // Our own endpoint, authenticated by session cookie — without this the
    // render is a 401 and no label is ever asked for.
    expect(textInit.credentials).toBe('same-origin');

    expect(fetchMock.mock.calls[1][0]).toBe(`${PRINT_SERVICE}/available`);
    const [sendUrl, init] = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(sendUrl).toBe(`${PRINT_SERVICE}/write`);
    expect(init.method).toBe('POST');
    // The USB device, not the one the service reached over the network
    // (OMS-REG-SET-05.8). Every listed field is carried through EXCEPT
    // `version`, which is replaced with the level we speak — echoing the
    // listing's 5 back is taken with a 200 and prints nothing.
    expect(JSON.parse(String(init.body))).toEqual({
      device: { ...usbPrinter, version: 2 },
      data: '^XA^FDlabel^FS^XZ',
    });
  });

  it('asks for a single-record label as itself, not wrapped in a list', async () => {
    const fetchMock = usbRouteAnswers({
      listing: devices([usbPrinter]),
      send: new Response(''),
    });

    await printLabels(ENDPOINT, assetLabel);

    const [textUrl] = fetchMock.mock.calls[0] as [string];
    expect(textUrl).toBe(
      `${ENDPOINT}?data=${encodeURIComponent(JSON.stringify(assetLabel))}`
    );
  });

  it.each([
    ['the listing is empty', () => devices([])],
    ['the listing has no printer key at all', () => new Response('{}')],
    ['nothing listed is a USB printer', () => devices([networkPrinter])],
    [
      'the USB device is not a printer',
      () => devices([{ ...usbPrinter, deviceType: 'scale' }]),
    ],
    ['discovery is refused', () => new Response('', { status: 500 })],
    ['the listing is not the shape we expect', () => new Response('nonsense')],
  ])('reports no-usb-printer when %s', async (_case, listing) => {
    const fetchMock = usbRouteAnswers({ listing: listing() });

    expect(await printLabels(ENDPOINT, labels)).toEqual({
      kind: 'no-usb-printer',
    });
    expect(fetchMock).toHaveBeenCalledTimes(2); // nothing was sent
  });

  it('reports no-usb-printer when the print service is not installed', async () => {
    // Connection refused on loopback — no status code to read.
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"zpl":"^XA^XZ"}'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', fetchMock);

    expect(await printLabels(ENDPOINT, labels)).toEqual({
      kind: 'no-usb-printer',
    });
  });

  it.each([
    [
      'the text is refused',
      () =>
        new Response('Failed to parse data header as JSON', { status: 400 }),
    ],
    ['the body is not JSON', () => new Response('nonsense')],
  ])(
    'fails without looking for a printer when %s',
    async (_case, labelText) => {
      const fetchMock = usbRouteAnswers({ labelText: labelText() });

      expect((await printLabels(ENDPOINT, labels)).kind).toBe('failed');
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  );

  it("carries the print service's refusal as the failure detail", async () => {
    usbRouteAnswers({
      listing: devices([usbPrinter]),
      send: new Response('head open', { status: 500 }),
    });

    expect(await printLabels(ENDPOINT, labels)).toEqual({
      kind: 'failed',
      detail: 'head open',
    });
  });
});
