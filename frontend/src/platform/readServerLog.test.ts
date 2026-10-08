import { afterEach, describe, expect, it, vi } from 'vitest';
import { readServerLog, saveServerLog } from './readServerLog';
import { saveBlob } from './openDocument';

// A window carrying a Capacitor bridge reporting the android platform — what
// isAndroid() keys off (mirrors openDocument's device tests).
const androidWindow = () => ({
  Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true },
});

// Mock the ReadLog plugin returned by registerPlugin('ReadLog'). readServerLog
// dynamically imports @capacitor/core only on the android path.
const mockReadLog = vi.fn();
vi.mock('@capacitor/core', () => ({
  registerPlugin: () => ({ readLog: mockReadLog }),
}));

// Isolate saveServerLog's composition (read → save) from the platform save
// mechanics, which openDocument.test.ts already covers on both forks.
vi.mock('./openDocument', () => ({
  saveBlob: vi.fn(),
}));
const mockSaveBlob = vi.mocked(saveBlob);

describe('readServerLog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('is not-ok off android and never touches the native plugin', async () => {
    vi.stubGlobal('window', {}); // no Capacitor → web
    const result = await readServerLog();
    expect(result.ok).toBe(false);
    expect(mockReadLog).not.toHaveBeenCalled();
  });

  it('returns the log text on android when the file has content', async () => {
    vi.stubGlobal('window', androidWindow());
    mockReadLog.mockResolvedValue({ log: 'line one\nline two\n' });
    const result = await readServerLog();
    expect(result).toEqual({ ok: true, log: 'line one\nline two\n' });
  });

  it('is not-ok when the native side reports an error', async () => {
    vi.stubGlobal('window', androidWindow());
    mockReadLog.mockResolvedValue({ log: '', error: 'Log file not found' });
    const result = await readServerLog();
    expect(result.ok).toBe(false);
  });

  it('is not-ok when the log is present but empty (nothing worth saving)', async () => {
    vi.stubGlobal('window', androidWindow());
    mockReadLog.mockResolvedValue({ log: '   \n' });
    const result = await readServerLog();
    expect(result.ok).toBe(false);
  });

  it('never throws when the native call rejects', async () => {
    vi.stubGlobal('window', androidWindow());
    mockReadLog.mockRejectedValue(new Error('bridge exploded'));
    const result = await readServerLog();
    expect(result).toEqual({ ok: false, message: 'bridge exploded' });
  });
});

describe('saveServerLog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('does not attempt a save when there is no log to save', async () => {
    // Web path: readServerLog is not-ok, so saveServerLog returns that failure
    // verbatim and never calls saveBlob.
    vi.stubGlobal('window', {});

    const result = await saveServerLog();

    expect(result.ok).toBe(false);
    expect(mockSaveBlob).not.toHaveBeenCalled();
  });

  it('reads the log then hands it to saveBlob as a text blob', async () => {
    vi.stubGlobal('window', androidWindow());
    mockReadLog.mockResolvedValue({ log: 'diagnostic output\n' });
    mockSaveBlob.mockResolvedValue({ ok: true, saved: true });

    const result = await saveServerLog();

    expect(mockSaveBlob).toHaveBeenCalledOnce();
    const [blob, fileName] = mockSaveBlob.mock.calls[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('text/plain');
    expect(await blob.text()).toBe('diagnostic output\n');
    expect(fileName).toBe('remote_server.log');
    expect(result).toEqual({ ok: true, saved: true });
  });
});
