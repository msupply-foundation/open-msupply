import { Capacitor, registerPlugin } from '@capacitor/core';
import { useEffect, useCallback } from 'react';

export interface HoneywellScannerPlugin {
  softwareTriggerStart(): Promise<void>;
  softwareTriggerStop(): Promise<void>;
  listen(
    callback: (data: { barcode: string } | { error: string }) => void
  ): Promise<void>;
  claim(): Promise<void>;
  release(): Promise<void>;
  available(): Promise<{ available: boolean }>;
}

const HoneywellScanner =
  registerPlugin<HoneywellScannerPlugin>('HoneywellScanner');

export interface UseHoneywellScannerProps {
  onScan?: (barcode: string) => void;
  onError?: (error: string) => void;
  enabled?: boolean;
}

export const useHoneywellScanner = ({
  onScan,
  onError,
  enabled = true,
}: UseHoneywellScannerProps = {}) => {
  const isAvailable =
    Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';

  useEffect(() => {
    if (!isAvailable || !enabled) return;

    let isMounted = true;

    const setupListener = async () => {
      try {
        await HoneywellScanner.listen(data => {
          if (!isMounted) return;

          if ('barcode' in data) {
            onScan?.(data.barcode);
          } else if ('error' in data) {
            onError?.(data.error);
          }
        });
      } catch (error) {
        console.error('Failed to setup Honeywell scanner listener:', error);
        onError?.(error instanceof Error ? error.message : 'Unknown error');
      }
    };

    setupListener();

    return () => {
      isMounted = false;
    };
  }, [isAvailable, enabled, onScan, onError]);

  const startScan = useCallback(async () => {
    if (!isAvailable) {
      throw new Error('Honeywell scanner is not available on this device');
    }
    try {
      await HoneywellScanner.softwareTriggerStart();
    } catch (error) {
      console.error('Failed to start Honeywell scanner:', error);
      throw error;
    }
  }, [isAvailable]);

  const stopScan = useCallback(async () => {
    if (!isAvailable) return;
    try {
      await HoneywellScanner.softwareTriggerStop();
    } catch (error) {
      console.error('Failed to stop Honeywell scanner:', error);
      throw error;
    }
  }, [isAvailable]);

  const claim = useCallback(async () => {
    if (!isAvailable) return;
    try {
      await HoneywellScanner.claim();
    } catch (error) {
      console.error('Failed to claim Honeywell scanner:', error);
      throw error;
    }
  }, [isAvailable]);

  const release = useCallback(async () => {
    if (!isAvailable) return;
    try {
      await HoneywellScanner.release();
    } catch (error) {
      console.error('Failed to release Honeywell scanner:', error);
      throw error;
    }
  }, [isAvailable]);

  const checkAvailable = useCallback(async (): Promise<boolean> => {
    if (!isAvailable) return false;
    try {
      const result = await HoneywellScanner.available();
      return result.available;
    } catch (error) {
      console.error('Failed to check Honeywell scanner availability:', error);
      return false;
    }
  }, [isAvailable]);

  return {
    startScan,
    stopScan,
    claim,
    release,
    checkAvailable,
    isAvailable,
  };
};

// Export the plugin directly for advanced usage
export { HoneywellScanner };
