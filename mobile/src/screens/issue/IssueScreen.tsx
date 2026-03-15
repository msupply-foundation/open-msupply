import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation, useLazyQuery } from "@apollo/client";
import { v4 as uuid } from "uuid";
import BackButton from "../../components/BackButton";
import { useAuth } from "../../hooks/useAuth";
import { useAppPreferences, PREF_KEYS } from "../../hooks/useAppPreferences";
import { useBarcodeScanner } from "../../hooks/useBarcodeScanner";
import {
  BARCODE_BY_GTIN,
  ITEM_BY_ID,
  INSERT_PRESCRIPTION,
  UPDATE_PRESCRIPTION,
  SAVE_PRESCRIPTION_ITEM_LINES,
  STOCK_LINES_FOR_ITEM,
} from "../../api/graphql/operations";
import { extractGtin } from "../../utils/gs1";

interface LineAllocation {
  lineId: string;
  stockLineId: string;
  numberOfPacks: number;
}

interface PrescriptionItem {
  itemId: string;
  itemName: string;
  quantity: number;
  allocations: LineAllocation[];
}

export default function IssueScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { storeId } = useAuth();
  const prefs = useAppPreferences();
  const { scan, scanning } = useBarcodeScanner();

  const [prescriptionId, setPrescriptionId] = useState(() => uuid());
  const [items, setItems] = useState<PrescriptionItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editQty, setEditQty] = useState("");

  const [barcodeQuery] = useLazyQuery(BARCODE_BY_GTIN);
  const [itemQuery] = useLazyQuery(ITEM_BY_ID);
  const [stockLinesQuery] = useLazyQuery(STOCK_LINES_FOR_ITEM);
  const [insertPrescription] = useMutation(INSERT_PRESCRIPTION);
  const [updatePrescription] = useMutation(UPDATE_PRESCRIPTION);
  const [savePrescriptionLines] = useMutation(SAVE_PRESCRIPTION_ITEM_LINES);

  const [patientId, setPatientId] = useState<string | null>(null);

  // Refs for async-safe access to latest state
  const prescriptionCreatedRef = useRef(false);
  const itemsRef = useRef<PrescriptionItem[]>([]);
  itemsRef.current = items;

  // Load patient ID — only once on mount
  const patientLoadedRef = useRef(false);
  useEffect(() => {
    if (patientLoadedRef.current) return;
    patientLoadedRef.current = true;
    prefs.get<string>(PREF_KEYS.NAME_ID).then(setPatientId);
  }, [prefs]);

  // ── Create the prescription on first item add ───────────────────────────
  const ensurePrescriptionCreated = useCallback(async () => {
    if (prescriptionCreatedRef.current || !storeId || !patientId) return;

    await insertPrescription({
      variables: { storeId, id: prescriptionId, patientId },
    });

    prescriptionCreatedRef.current = true;
  }, [storeId, patientId, prescriptionId, insertPrescription]);

  // ── Allocate stock for an item using FEFO ───────────────────────────────
  const allocateStock = useCallback(
    async (itemId: string, requestedQty: number): Promise<LineAllocation[]> => {
      if (!storeId) return [];

      const { data } = await stockLinesQuery({
        variables: { storeId, itemId },
        fetchPolicy: "network-only",
      });

      const stockNodes = data?.stockLines?.nodes ?? [];
      if (stockNodes.length === 0) return [];

      // Check if we already have line IDs for this item's stock lines
      const existing = itemsRef.current.find((i) => i.itemId === itemId);
      const existingLineMap = new Map<string, string>();
      if (existing) {
        for (const a of existing.allocations) {
          existingLineMap.set(a.stockLineId, a.lineId);
        }
      }

      const allocations: LineAllocation[] = [];
      let remaining = requestedQty;

      for (const sl of stockNodes) {
        if (remaining <= 0) break;
        const available = sl.availableNumberOfPacks ?? 0;
        if (available <= 0) continue;

        const take = Math.min(remaining, available);
        allocations.push({
          // Reuse existing line ID for same stock line, or generate new
          lineId: existingLineMap.get(sl.id) ?? uuid(),
          stockLineId: sl.id,
          numberOfPacks: take,
        });
        remaining -= take;
      }

      return allocations;
    },
    [storeId, stockLinesQuery]
  );

  // ── Save allocations to the server ──────────────────────────────────────
  const saveItemLines = useCallback(
    async (itemId: string, allocations: LineAllocation[]) => {
      if (!storeId || allocations.length === 0) return;

      await savePrescriptionLines({
        variables: {
          storeId,
          input: {
            invoiceId: prescriptionId,
            itemId,
            lines: allocations.map((a) => ({
              id: a.lineId,
              stockLineId: a.stockLineId,
              numberOfPacks: a.numberOfPacks,
            })),
          },
        },
      });
    },
    [storeId, prescriptionId, savePrescriptionLines]
  );

  // ── Add or increment an item ────────────────────────────────────────────
  const addItem = useCallback(
    async (itemId: string, itemName: string) => {
      if (!storeId) return;

      setAdding(true);
      setError(null);

      try {
        await ensurePrescriptionCreated();

        const currentItems = itemsRef.current;
        const existingIdx = currentItems.findIndex((i) => i.itemId === itemId);
        const newQty =
          existingIdx >= 0 ? currentItems[existingIdx].quantity + 1 : 1;

        const allocations = await allocateStock(itemId, newQty);

        if (allocations.length === 0) {
          setError(`No available stock for ${itemName}`);
          return;
        }

        await saveItemLines(itemId, allocations);

        if (existingIdx >= 0) {
          setItems((prev) =>
            prev.map((item, idx) =>
              idx === existingIdx
                ? { ...item, quantity: newQty, allocations }
                : item
            )
          );
        } else {
          setItems((prev) => [
            ...prev,
            { itemId, itemName, quantity: newQty, allocations },
          ]);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to add item"
        );
      } finally {
        setAdding(false);
      }
    },
    [storeId, ensurePrescriptionCreated, allocateStock, saveItemLines]
  );

  // ── Handle item selected from search screen ─────────────────────────────
  // Use a ref + timestamp to avoid dependency on addItem (which changes
  // with items state), preventing re-triggering loops.
  const pendingSelectionRef = useRef<{
    id: string;
    name: string;
    ts: number;
  } | null>(null);

  useEffect(() => {
    const selected = (
      location.state as { selectedItem?: { id: string; name: string } }
    )?.selectedItem;

    if (selected) {
      pendingSelectionRef.current = {
        id: selected.id,
        name: selected.name,
        ts: Date.now(),
      };
      // Clear the location state immediately
      navigate("/issue", { replace: true, state: {} });
    }
  }, [location.state, navigate]);

  // Process the pending selection separately, so addItem dependency
  // changes don't re-trigger the location state effect
  useEffect(() => {
    const pending = pendingSelectionRef.current;
    if (!pending) return;

    // Only process once
    const ts = pending.ts;
    pendingSelectionRef.current = null;

    addItem(pending.id, pending.name);

    // Cleanup: if this effect re-runs, don't re-process
    return () => {
      if (
        pendingSelectionRef.current &&
        pendingSelectionRef.current.ts === ts
      ) {
        pendingSelectionRef.current = null;
      }
    };
  }, [addItem]);

  // ── Barcode scan handler ────────────────────────────────────────────────
  const handleScan = async () => {
    if (!storeId) return;

    setError(null);
    const rawBarcode = await scan();
    if (!rawBarcode) return;

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
        await addItem(barcodeNode.itemId, itemName);
      } else {
        navigate("/issue/search", {
          state: { returnTo: "/issue", barcode: gtin },
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Barcode lookup failed"
      );
    }
  };

  // ── Finish: set status to PICKED ────────────────────────────────────────
  const handleFinish = async () => {
    if (!storeId || !prescriptionCreatedRef.current) {
      resetState();
      return;
    }

    setFinishing(true);
    setError(null);

    try {
      await updatePrescription({
        variables: {
          storeId,
          input: { id: prescriptionId, status: "PICKED" },
        },
      });

      resetState();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to finalise prescription"
      );
    } finally {
      setFinishing(false);
    }
  };

  const resetState = () => {
    setPrescriptionId(uuid());
    prescriptionCreatedRef.current = false;
    setItems([]);
    setError(null);
  };

  // ── Edit quantity ───────────────────────────────────────────────────────
  const handleQuantityEdit = async (idx: number) => {
    if (!storeId) return;

    const newQty = parseInt(editQty, 10);
    if (isNaN(newQty) || newQty < 1) {
      setEditingIdx(null);
      return;
    }

    const item = items[idx];
    try {
      const allocations = await allocateStock(item.itemId, newQty);

      if (allocations.length === 0) {
        setError(`No available stock for ${item.itemName}`);
        setEditingIdx(null);
        return;
      }

      await saveItemLines(item.itemId, allocations);

      setItems((prev) =>
        prev.map((it, i) =>
          i === idx ? { ...it, quantity: newQty, allocations } : it
        )
      );
    } catch {
      // Keep old value on error
    }

    setEditingIdx(null);
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
            disabled={scanning || !patientId || finishing || adding}
          >
            {scanning ? "Scanning..." : adding ? "Adding..." : "Scan Barcode"}
          </button>
          <button
            className="btn-secondary"
            onClick={() =>
              navigate("/issue/search", {
                state: { returnTo: "/issue" },
              })
            }
            disabled={!patientId || finishing || adding}
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
                  </div>
                  <div className="ml-3 flex items-center">
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

        {/* Finish button — only when items exist */}
        {items.length > 0 && (
          <div className="mt-4 pb-2">
            <button
              className="btn-primary"
              onClick={handleFinish}
              disabled={finishing}
            >
              {finishing ? "Finalising..." : "Finish & Pick"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
