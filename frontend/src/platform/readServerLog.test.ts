import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveServerLog } from './readServerLog';
import { saveStagedFile } from './openDocument';

// A window carrying a Capacitor bridge reporting the android platform — what
// isAndroid() keys off (mirrors openDocument's device tests).
const androidWindow = () => ({
  Capacitor: { getPlatform: () => 'android', isNativePlatform: () => true },
});

// Mock the ReadLog plugin returned by registerPlugin('ReadLog').
// saveServerLog dynamically imports @capacitor/core only on the android path.
const mockStageLog = vi.fn();
vi.mock('@capacitor/core', () => ({
  registerPlugin: () => ({ stageLog: mockStageLog }),
}));

// Isolate saveServerLog's composition (stage → save) from the platform save
// mechanics.
vi.mock('./openDocument', () => ({
  saveStagedFile: vi.fn(),
}));
const mockSaveStagedFile = vi.mocked(saveStagedFile);

describe('saveServerLog', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('is not-ok off android and never touches the native plugin', async () => {
    vi.stubGlobal('window', {}); // no Capacitor → web
    const result = await saveServerLog();
    expect(result.ok).toBe(false);
    expect(mockStageLog).not.toHaveBeenCalled();
    expect(mockSaveStagedFile).not.toHaveBeenCalled();
  });

  it('hands the staged log to the save flow', async () => {
    vi.stubGlobal('window', androidWindow());
    mockStageLog.mockResolvedValue({
      uri: 'file:///cache/staged-remote_server.log',
      path: 'staged-remote_server.log',
    });
    mockSaveStagedFile.mockResolvedValue({ ok: true, saved: true });

    const result = await saveServerLog();

    expect(mockSaveStagedFile).toHaveBeenCalledWith(
      {
        uri: 'file:///cache/staged-remote_server.log',
        path: 'staged-remote_server.log',
      },
      'remote_server.log',
      'text/plain'
    );
    expect(result).toEqual({ ok: true, saved: true });
  });

  it('does not attempt a save when the native side reports no log', async () => {
    vi.stubGlobal('window', androidWindow());
    mockStageLog.mockResolvedValue({ error: 'Log file not found or empty' });
    const result = await saveServerLog();
    expect(result.ok).toBe(false);
    expect(mockSaveStagedFile).not.toHaveBeenCalled();
  });

  it('never throws when the native call rejects', async () => {
    vi.stubGlobal('window', androidWindow());
    mockStageLog.mockRejectedValue(new Error('bridge exploded'));
    const result = await saveServerLog();
    expect(result).toEqual({ ok: false, message: 'bridge exploded' });
  });
});
