import { useState, useEffect, useCallback, useRef } from "react";
import { useLazyQuery } from "@apollo/client";
import { useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import BackButton from "../components/BackButton";
import { useAuth } from "../hooks/useAuth";
import { useAppPreferences, PREF_KEYS } from "../hooks/useAppPreferences";
import { useBarcodeScanner } from "../hooks/useBarcodeScanner";
import { PATIENTS_BY_CODE } from "../api/graphql/operations";

interface DiscoveredServer {
  name: string;
  host: string;
  port: number;
  url: string;
}

interface ConnectionTestResult {
  success: boolean;
  message: string;
}

/** Build a clean HTTPS URL, omitting :443 since it's the default. */
function buildServerUrl(host: string, port: string): string {
  const h = host.trim();
  const p = port.trim() || "443";
  if (p === "443") return `https://${h}`;
  return `https://${h}:${p}`;
}

export default function SettingsScreen() {
  const navigate = useNavigate();
  const { serverUrl, storeId, storeName, setServerUrlAndSave } = useAuth();
  const prefs = useAppPreferences();
  const { scan } = useBarcodeScanner();

  // Server connection state
  const [host, setHost] = useState("");
  const [port, setPort] = useState("443");
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(
    null
  );
  const [testing, setTesting] = useState(false);
  const [discoveredServers, setDiscoveredServers] = useState<
    DiscoveredServer[]
  >([]);
  const [browsing, setBrowsing] = useState(false);

  // Name code state
  const [nameCode, setNameCode] = useState("");
  const [nameDisplay, setNameDisplay] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const [fetchPatients] = useLazyQuery(PATIENTS_BY_CODE);

  // Load saved values — run only once on mount
  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    (async () => {
      const savedCode = await prefs.get<string>(PREF_KEYS.NAME_CODE);
      const savedDisplay = await prefs.get<string>(PREF_KEYS.NAME_DISPLAY);
      if (savedCode) setNameCode(savedCode);
      if (savedDisplay) setNameDisplay(savedDisplay);

      if (serverUrl) {
        try {
          const url = new URL(serverUrl);
          setHost(url.hostname);
          setPort(url.port || "443");
        } catch {
          // Not a valid URL, ignore
        }
      }
    })();
  }, [prefs, serverUrl]);

  // ─── Server URL helpers ────────────────────────────────────────────────────

  const saveUrl = useCallback(
    async (url: string) => {
      await setServerUrlAndSave(url);
      setTestResult(null);
    },
    [setServerUrlAndSave]
  );

  const handleManualSave = () => {
    if (!host.trim()) return;
    const url = buildServerUrl(host, port);
    saveUrl(url);
  };

  const handleScanQR = async () => {
    const result = await scan();
    if (result) {
      await saveUrl(result);
    }
  };

  const handleTestConnection = async () => {
    if (!serverUrl) return;

    setTesting(true);
    setTestResult(null);

    try {
      // Use Rust-side HTTP request to bypass WebView CORS restrictions
      const result = await invoke<ConnectionTestResult>("test_connection", {
        url: serverUrl,
      });
      setTestResult(result);
    } catch (err) {
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setTesting(false);
    }
  };

  // ─── mDNS discovery ───────────────────────────────────────────────────────

  const handleBrowse = async () => {
    setDiscoveredServers([]);
    setBrowsing(true);

    try {
      await invoke("browse_mdns");
    } catch {
      // mDNS not available (e.g. desktop dev mode)
    }

    // Auto-stop indicator after 10s
    setTimeout(() => setBrowsing(false), 10000);
  };

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<DiscoveredServer>("mdns-discovered", (event) => {
      setDiscoveredServers((prev) => {
        if (prev.some((s) => s.url === event.payload.url)) return prev;
        return [...prev, event.payload];
      });
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  // ─── Name code resolution ─────────────────────────────────────────────────

  const resolveNameCode = async () => {
    if (!nameCode.trim() || !storeId) return;

    setNameError(null);
    setNameDisplay(null);

    try {
      const { data } = await fetchPatients({
        variables: { storeId, code: nameCode.trim() },
      });

      const nodes = data?.patients?.nodes ?? [];
      if (nodes.length > 0) {
        const found = nodes[0];
        await prefs.set(PREF_KEYS.NAME_CODE, nameCode.trim());
        await prefs.set(PREF_KEYS.NAME_ID, found.id);
        await prefs.set(PREF_KEYS.NAME_DISPLAY, found.name);
        setNameDisplay(found.name);
      } else {
        setNameError(`Name not found for code '${nameCode.trim()}'`);
        await prefs.remove(PREF_KEYS.NAME_ID);
        await prefs.remove(PREF_KEYS.NAME_DISPLAY);
      }
    } catch {
      setNameError("Failed to look up name code");
    }
  };

  return (
    <div className="screen-container">
      <div className="screen-header">
        <BackButton />
        <h1 className="screen-header-title">Settings</h1>
        <div className="w-10" />
      </div>

      <div className="screen-body space-y-6">
        {/* Server Connection */}
        <section className="card space-y-4">
          <h2 className="text-base font-semibold">Server Connection</h2>

          {serverUrl && (
            <p className="text-sm text-gray-500">Current: {serverUrl}</p>
          )}

          {/* Manual entry — primary method */}
          <div className="flex gap-2">
            <input
              className="input-field flex-1"
              placeholder="Host (e.g. demo-open.msupply.org)"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            />
            <input
              className="input-field w-20"
              placeholder="Port"
              value={port}
              onChange={(e) => setPort(e.target.value)}
              inputMode="numeric"
            />
          </div>
          <button className="btn-primary" onClick={handleManualSave}>
            Save
          </button>

          {/* Test */}
          {serverUrl && (
            <>
              <button
                className="btn-secondary"
                onClick={handleTestConnection}
                disabled={testing}
              >
                {testing ? "Testing..." : "Test Connection"}
              </button>
              {testResult && (
                <p
                  className={`text-sm ${
                    testResult.success ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {testResult.message}
                </p>
              )}
            </>
          )}

          {/* QR / mDNS — secondary methods */}
          <div className="border-t border-gray-100 pt-4">
            <p className="mb-2 text-xs font-medium uppercase text-gray-400">
              Other ways to connect
            </p>
            <div className="space-y-2">
              <button className="btn-secondary" onClick={handleScanQR}>
                Scan Server QR Code
              </button>
              <button
                className="btn-secondary"
                onClick={handleBrowse}
                disabled={browsing}
              >
                {browsing ? "Searching..." : "Auto-discover on Network"}
              </button>
            </div>
          </div>

          {discoveredServers.length > 0 && (
            <div className="space-y-2">
              {discoveredServers.map((server) => (
                <button
                  key={server.url}
                  onClick={() => saveUrl(server.url)}
                  className="w-full rounded-lg border border-gray-200 p-3 text-left active:bg-gray-50"
                >
                  <p className="text-sm font-medium">{server.name}</p>
                  <p className="text-xs text-gray-500">{server.url}</p>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Patient Code */}
        <section className="card space-y-4">
          <h2 className="text-base font-semibold">Patient Code</h2>
          <p className="text-sm text-gray-500">
            Patient code used as the recipient for prescriptions
          </p>

          <div className="flex gap-2">
            <input
              className="input-field flex-1"
              placeholder="e.g. PATIENT01"
              value={nameCode}
              onChange={(e) => setNameCode(e.target.value)}
              autoCapitalize="characters"
            />
            <button
              className="rounded-lg bg-primary-600 px-4 text-white active:bg-primary-700 disabled:bg-gray-300"
              onClick={resolveNameCode}
              disabled={!nameCode.trim() || !storeId}
            >
              Save
            </button>
          </div>

          {storeId && storeName && (
            <p className="text-sm text-gray-500">
              Store: <span className="font-medium text-gray-700">{storeName}</span>
            </p>
          )}

          {nameDisplay && (
            <p className="text-sm text-green-600">Found: {nameDisplay}</p>
          )}
          {nameError && (
            <p className="text-sm text-red-600">{nameError}</p>
          )}
          {!storeId && (
            <p className="text-sm text-yellow-600">
              Log in first to validate the name code
            </p>
          )}
        </section>

        {/* Data Collection */}
        <section className="card">
          <button
            className="flex w-full items-center justify-between"
            onClick={() => navigate("/settings/data-collection")}
          >
            <div>
              <h2 className="text-base font-semibold">Data Collection</h2>
              <p className="text-sm text-gray-500">
                Configure demographics and other data screens
              </p>
            </div>
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          </button>
        </section>
      </div>
    </div>
  );
}
