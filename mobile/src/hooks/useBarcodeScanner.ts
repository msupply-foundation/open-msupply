import { useCallback, useState } from "react";

// On desktop/web, the barcode scanner plugin isn't available.
// We dynamically import it only when running in Tauri mobile context.
async function getScannerPlugin() {
  try {
    const mod = await import("@tauri-apps/plugin-barcode-scanner");
    return mod;
  } catch {
    return null;
  }
}

export function useBarcodeScanner() {
  const [scanning, setScanning] = useState(false);

  const scan = useCallback(async (): Promise<string | null> => {
    const plugin = await getScannerPlugin();
    if (!plugin) {
      // Fallback: prompt for manual entry (dev/desktop mode)
      const code = window.prompt("Enter barcode (dev mode):");
      return code || null;
    }

    // We push a history entry so the Android hardware back button fires
    // a popstate event (which we use to cancel the scanner) instead of
    // leaving the app.
    let cancelledViaBack = false;

    const backHandler = () => {
      cancelledViaBack = true;
      plugin.cancel().catch(() => {});
    };

    try {
      setScanning(true);

      // Check permissions first
      const perms = await plugin.checkPermissions();
      if (perms !== "granted") {
        const requested = await plugin.requestPermissions();
        if (requested !== "granted") {
          throw new Error("Camera permission denied");
        }
      }

      // Push a dummy state for back-button interception.
      // We use replaceState to clean it up (not history.back()) so we
      // don't trigger popstate which would confuse React Router.
      window.history.pushState({ scanner: true }, "");
      window.addEventListener("popstate", backHandler);

      const result = await plugin.scan({
        windowed: false,
        formats: [],
      });

      return result.content;
    } catch (err) {
      if (
        cancelledViaBack ||
        (err instanceof Error && err.message.includes("cancelled"))
      ) {
        return null;
      }
      throw err;
    } finally {
      window.removeEventListener("popstate", backHandler);
      setScanning(false);

      // If the user didn't press back, we still have an extra history
      // entry from our pushState.  We must NOT call history.back() here
      // because that fires a popstate event that React Router interprets
      // as a navigation, breaking the current route.
      //
      // Instead we silently overwrite the entry so the back stack length
      // stays +1 but it no longer carries the scanner marker.  This is a
      // harmless no-op entry that gets popped naturally on next back press.
      if (!cancelledViaBack) {
        try {
          window.history.replaceState(null, "");
        } catch {
          // ignore
        }
      }
    }
  }, []);

  const cancel = useCallback(async () => {
    const plugin = await getScannerPlugin();
    if (plugin) {
      try {
        await plugin.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
    setScanning(false);
  }, []);

  return { scan, cancel, scanning };
}
