import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLazyQuery } from "@apollo/client";
import { v4 as uuid } from "uuid";
import BackButton from "../../components/BackButton";
import { useAuth } from "../../hooks/useAuth";
import { useAppPreferences, PREF_KEYS } from "../../hooks/useAppPreferences";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import {
  BARCODE_BY_GTIN,
  ITEM_BY_ID,
} from "../../api/graphql/operations";
import { extractGtin } from "../../utils/gs1";

export interface PrescriptionItem {
  itemId: string;
  itemName: string;
  quantity: number;
  availableStock: number;
}

interface LocationState {
  existingItems?: PrescriptionItem[];
  selectedItem?: { id: string; name: string; availableStock: number };
}

export default function IssueScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { storeId } = useAuth();
  const prefs = useAppPreferences();
  const { scan, scanning } = useBarcodeScanner();

  // Restore items from navigation round-trip (survives search / demographics navigation)
  const locState = location.state as LocationState | null;
  const [items, setItems] = useState<PrescriptionItem[]>(
    () => locState?.existingItems ?? []
  );
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editQty, setEditQty] = useState("");

  const [barcodeQuery] = useLazyQuery(BARCODE_BY_GTIN);
  const [itemQuery] = useLazyQuery(ITEM_BY_ID);

  const [patientId, setPatientId] = useState<string | null>(null);

  // Load patient ID — only once on mount
  const patientLoadedRef = useRef(false);
  useEffect(() => {
    if (patientLoadedRef.current) return;
    patientLoadedRef.current = true;
    prefs.get<string>(PREF_KEYS.NAME_ID).then(setPatientId);
  }, [prefs]);

  // ── Add item to local list (no server calls) ─────────────────────────────
  const addItem = useCallback(
    (itemId: string, itemName: string, availableStock: number) => {
      setError(null);

      setItems((prev) => {
        const existingIdx = prev.findIndex((i) => i.itemId === itemId);
        if (existingIdx >= 0) {
          return prev.map((item, idx) =>
            idx === existingIdx
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + 1, item.availableStock),
                }
              : item
          );
        }
        return [
          ...prev,
          { itemId, itemName, quantity: Math.min(1, availableStock), availableStock },
        ];
      });
    },
    []
  );

  // ── Handle selectedItem from search on mount ──────────────────────────────
  const initRef = useRef(false);
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const selected = locState?.selectedItem;
    if (selected) {
      addItem(selected.id, selected.name, selected.availableStock);
    }

    // Clear location state so refreshes don't re-add
    navigate("/issue", { replace: true, state: {} });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Barcode scan handler ────────────────────────────────────────────────
  const handleScan = async () => {
    if (!storeId) return;

    setError(null);
    setAdding(true);

    const rawBarcode = await scan();
    if (!rawBarcode) {
      setAdding(false);
      return;
    }

    const gtin = extractGtin(rawBarcode);

    try {
      const { data } = await barcodeQuery({
        variables: { storeId, gtin },
      });

      const barcodeNode = data?.barcodeByGtin;
      if (barcodeNode?.itemId) {
        const { data: itemData } = await itemQuery({
          variables: { storeId, itemId: barcodeNode.itemId },
        });
        const itemNode = itemData?.items?.nodes?.[0];
        const itemName = itemNode?.name ?? barcodeNode.itemId;
        const availableStock = itemNode?.stats?.availableStockOnHand ?? 0;
        addItem(barcodeNode.itemId, itemName, availableStock);
      } else {
        navigate("/issue/search", {
          state: { returnTo: "/issue", existingItems: items, barcode: gtin },
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Barcode lookup failed");
    } finally {
      setAdding(false);
    }
  };

  // ── Remove item from list ───────────────────────────────────────────────
  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Edit quantity (local only, capped to available stock) ───────────────
  const handleQuantityEdit = (idx: number) => {
    const newQty = parseInt(editQty, 10);
    const item = items[idx];
    if (isNaN(newQty) || newQty < 1) {
      setEditingIdx(null);
      return;
    }

    const capped = Math.min(newQty, item.availableStock);
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, quantity: capped } : it))
    );
    setEditingIdx(null);
  };

  // ── Continue: navigate to demographics screen ───────────────────────────
  const handleContinue = () => {
    if (items.length === 0) return;
    navigate("/issue/demographics", {
      state: {
        prescriptionId: uuid(),
        items,
        existingItems: items,
      },
    });
  };

  return (
    <div className="screen-container">
      <div className="screen-header">
        <BackButton to="/home" />
        <h1 className="screen-header-title">Prescription</h1>
        <div className="w-10" />
      </div>

      <div className="screen-body flex flex-col">
        {/* Add item buttons — always visible */}
        <div className="mb-4 space-y-2">
          <button
            className="btn-primary"
            onClick={handleScan}
            disabled={scanning || !patientId || adding}
          >
            {scanning ? "Scanning..." : adding ? "Adding..." : "Scan Barcode"}
          </button>
          <button
            className="btn-secondary"
            onClick={() =>
              navigate("/issue/search", {
                state: { returnTo: "/issue", existingItems: items },
              })
            }
            disabled={!patientId || adding}
          >
            Search by Name
          </button>
        </div>

        {!patientId && (
          <p className="mb-4 text-center text-sm text-red-500">
            Set a patient code in Settings before issuing stock
          </p>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Item list */}
        {items.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={item.itemId}
                  className="card flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{item.itemName}</p>
                    <p className="text-xs text-gray-400">
                      {item.availableStock} available
                    </p>
                  </div>
                  <div className="ml-3 flex items-center gap-2">
                    {editingIdx === idx ? (
                      <input
                        className="w-16 rounded border border-primary-300 px-2 py-1 text-center text-sm"
                        type="number"
                        inputMode="numeric"
                        value={editQty}
                        onChange={(e) => setEditQty(e.target.value)}
                        onBlur={() => handleQuantityEdit(idx)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && handleQuantityEdit(idx)
                        }
                        autoFocus
                      />
                    ) : (
                      <button
                        className="rounded-lg bg-gray-100 px-3 py-1 text-sm font-semibold"
                        onClick={() => {
                          setEditingIdx(idx);
                          setEditQty(String(item.quantity));
                        }}
                      >
                        x{item.quantity}
                      </button>
                    )}
                    <button
                      className="rounded-lg p-1 text-red-400 active:bg-red-50"
                      onClick={() => handleRemoveItem(idx)}
                      aria-label="Remove item"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {items.length === 0 && patientId && (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-sm text-gray-400">
              Scan a barcode or search to start adding items
            </p>
          </div>
        )}

        {/* Continue button — only when items exist */}
        {items.length > 0 && (
          <div className="mt-4 pb-2">
            <button className="btn-primary" onClick={handleContinue}>
              Continue to Demographics
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
