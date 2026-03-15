import { useState, useMemo, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useLazyQuery } from "@apollo/client";
import { v4 as uuid } from "uuid";
import BackButton from "../../components/BackButton";
import { useAuth } from "../../hooks/useAuth";
import {
  STOCKTAKES,
  INSERT_STOCKTAKE,
  STOCKTAKE_LINES,
  UPDATE_STOCKTAKE_LINE,
  FINALISE_STOCKTAKE,
} from "../../api/graphql/operations";

// ─── Types ──────────────────────────────────────────────────────────────────

interface StocktakeLine {
  id: string;
  itemId: string;
  itemName: string;
  snapshotNumberOfPacks: number;
  countedNumberOfPacks: number | null;
  batch: string | null;
  expiryDate: string | null;
  item: { id: string; unitName: string | null };
}

interface AggregatedItem {
  itemId: string;
  itemName: string;
  unitName: string | null;
  currentStock: number;
  countedQty: number | null;
  lines: StocktakeLine[];
}

interface StocktakeInfo {
  id: string;
  stocktakeNumber: number;
  createdDatetime: string;
  description: string | null;
  comment: string | null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function StocktakeScreen() {
  const navigate = useNavigate();
  const { storeId } = useAuth();

  const [stocktakeId, setStocktakeId] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmFinalise, setConfirmFinalise] = useState(false);

  // ─── Stocktake list ─────────────────────────────────────────────────────

  const {
    data: stocktakeData,
    loading: loadingStocktakes,
    refetch: refetchStocktakes,
  } = useQuery(STOCKTAKES, {
    variables: { storeId: storeId! },
    skip: !storeId,
  });

  const stocktakes: StocktakeInfo[] =
    stocktakeData?.stocktakes?.nodes ?? [];

  const [insertStocktake, { loading: creating }] =
    useMutation(INSERT_STOCKTAKE);

  const handleCreateStocktake = async () => {
    if (!storeId) return;
    setError(null);

    try {
      const newId = uuid();
      await insertStocktake({ variables: { storeId, id: newId } });
      setStocktakeId(newId);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create stocktake"
      );
    }
  };

  // ─── Stocktake lines ───────────────────────────────────────────────────

  const [fetchLines, { data: linesData, loading: loadingLines }] =
    useLazyQuery(STOCKTAKE_LINES, { fetchPolicy: "network-only" });

  useEffect(() => {
    if (stocktakeId && storeId) {
      fetchLines({ variables: { storeId, stocktakeId } });
    }
  }, [stocktakeId, storeId, fetchLines]);

  const [updateStocktakeLine] = useMutation(UPDATE_STOCKTAKE_LINE);
  const [finaliseStocktake, { loading: finalising }] =
    useMutation(FINALISE_STOCKTAKE);

  // ─── Aggregate lines by item ──────────────────────────────────────────

  const aggregatedItems: AggregatedItem[] = useMemo(() => {
    const lines: StocktakeLine[] = linesData?.stocktakeLines?.nodes ?? [];
    const grouped = new Map<string, AggregatedItem>();

    for (const line of lines) {
      const existing = grouped.get(line.itemId);
      if (existing) {
        existing.currentStock += line.snapshotNumberOfPacks;
        existing.lines.push(line);
        if (
          line.countedNumberOfPacks !== null &&
          existing.countedQty === null
        ) {
          existing.countedQty = 0;
        }
        if (line.countedNumberOfPacks !== null) {
          existing.countedQty =
            (existing.countedQty ?? 0) + line.countedNumberOfPacks;
        }
      } else {
        grouped.set(line.itemId, {
          itemId: line.itemId,
          itemName: line.itemName,
          unitName: line.item?.unitName ?? null,
          currentStock: line.snapshotNumberOfPacks,
          countedQty: line.countedNumberOfPacks,
          lines: [line],
        });
      }
    }

    // Sort: uncounted first, then counted, then alphabetical
    return Array.from(grouped.values()).sort((a, b) => {
      const aCounted = a.countedQty !== null ? 1 : 0;
      const bCounted = b.countedQty !== null ? 1 : 0;
      if (aCounted !== bCounted) return aCounted - bCounted;
      return a.itemName.localeCompare(b.itemName);
    });
  }, [linesData]);

  const filteredItems = useMemo(() => {
    if (!searchFilter.trim()) return aggregatedItems;
    const lower = searchFilter.toLowerCase();
    return aggregatedItems.filter(
      (item) =>
        item.itemName.toLowerCase().includes(lower) ||
        item.itemId.toLowerCase().includes(lower)
    );
  }, [aggregatedItems, searchFilter]);

  const countedCount = aggregatedItems.filter(
    (i) => i.countedQty !== null
  ).length;

  // ─── Distribute count across batches ──────────────────────────────────
  //
  // When REDUCING stock (counted < snapshot), take from the shortest-expiry
  // batch first.  When INCREASING (counted > snapshot), add excess to the
  // longest-expiry batch.  When equal, keep each batch at its snapshot.

  const distributeCount = useCallback(
    async (item: AggregatedItem, totalCount: number) => {
      if (!storeId) return;

      if (item.lines.length === 1) {
        // Single batch — trivial case
        await updateStocktakeLine({
          variables: {
            storeId,
            input: {
              id: item.lines[0].id,
              countedNumberOfPacks: totalCount,
            },
          },
        });
        return;
      }

      const totalSnapshot = item.lines.reduce(
        (sum, l) => sum + l.snapshotNumberOfPacks,
        0
      );

      // Sort by expiry ascending (shortest first). Null expiry = last.
      const sorted = [...item.lines].sort((a, b) => {
        if (!a.expiryDate && !b.expiryDate) return 0;
        if (!a.expiryDate) return 1;
        if (!b.expiryDate) return -1;
        return a.expiryDate.localeCompare(b.expiryDate);
      });

      const lineCounts = new Map<string, number>();

      if (totalCount >= totalSnapshot) {
        // Equal or increase: keep each batch at its snapshot,
        // add any excess to the longest-expiry batch.
        for (const line of sorted) {
          lineCounts.set(line.id, line.snapshotNumberOfPacks);
        }
        const excess = totalCount - totalSnapshot;
        if (excess > 0) {
          const longest = sorted[sorted.length - 1];
          lineCounts.set(
            longest.id,
            (lineCounts.get(longest.id) ?? 0) + excess
          );
        }
      } else {
        // Reduction: remove from shortest-expiry batches first.
        let remaining = totalSnapshot - totalCount;
        for (const line of sorted) {
          const reduce = Math.min(remaining, line.snapshotNumberOfPacks);
          lineCounts.set(line.id, line.snapshotNumberOfPacks - reduce);
          remaining -= reduce;
        }
      }

      // Send updates
      for (const line of item.lines) {
        const count =
          lineCounts.get(line.id) ?? line.snapshotNumberOfPacks;
        await updateStocktakeLine({
          variables: {
            storeId,
            input: { id: line.id, countedNumberOfPacks: count },
          },
        });
      }
    },
    [storeId, updateStocktakeLine]
  );

  const handleCountSubmit = async (item: AggregatedItem) => {
    const count = parseInt(editQty, 10);
    if (isNaN(count) || count < 0) {
      setEditingItemId(null);
      return;
    }

    setError(null);
    try {
      await distributeCount(item, count);
      if (storeId && stocktakeId) {
        await fetchLines({ variables: { storeId, stocktakeId } });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save count"
      );
    }

    setEditingItemId(null);
  };

  const handleFinalise = async () => {
    if (!storeId || !stocktakeId) return;
    setError(null);

    try {
      await finaliseStocktake({
        variables: {
          storeId,
          input: { id: stocktakeId, status: "FINALISED" },
        },
      });
      navigate("/home", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to finalise stocktake"
      );
      setConfirmFinalise(false);
    }
  };

  const handleBackToList = () => {
    setStocktakeId(null);
    setSearchFilter("");
    setEditingItemId(null);
    setError(null);
    setConfirmFinalise(false);
    refetchStocktakes();
  };

  // ─── Render: loading ──────────────────────────────────────────────────

  if (loadingStocktakes) {
    return (
      <div className="screen-container">
        <div className="screen-header">
          <BackButton to="/home" />
          <h1 className="screen-header-title">Stocktake</h1>
          <div className="w-10" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
        </div>
      </div>
    );
  }

  // ─── Render: stocktake list (no stocktake selected) ───────────────────

  if (!stocktakeId) {
    return (
      <div className="screen-container">
        <div className="screen-header">
          <BackButton to="/home" />
          <h1 className="screen-header-title">Stocktake</h1>
          <div className="w-10" />
        </div>

        <div className="screen-body space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {stocktakes.length > 0 && (
            <section>
              <h2 className="mb-2 text-sm font-medium text-gray-500">
                In Progress
              </h2>
              <div className="space-y-2">
                {stocktakes.map((st) => (
                  <button
                    key={st.id}
                    className="card w-full text-left active:bg-gray-50"
                    onClick={() => setStocktakeId(st.id)}
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">
                        Stocktake #{st.stocktakeNumber}
                      </p>
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        NEW
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Created{" "}
                      {new Date(st.createdDatetime).toLocaleDateString()}
                    </p>
                    {st.description && (
                      <p className="mt-1 text-sm text-gray-600">
                        {st.description}
                      </p>
                    )}
                    {st.comment && (
                      <p className="mt-0.5 text-xs text-gray-400 italic">
                        {st.comment}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            </section>
          )}

          {stocktakes.length === 0 && (
            <p className="py-8 text-center text-gray-500">
              No stocktakes in progress.
            </p>
          )}

          <button
            className="btn-primary"
            onClick={handleCreateStocktake}
            disabled={creating}
          >
            {creating ? "Creating..." : "Start New Stocktake"}
          </button>
        </div>
      </div>
    );
  }

  // ─── Render: stocktake detail ─────────────────────────────────────────

  return (
    <div className="screen-container">
      <div className="screen-header">
        <button
          className="flex h-10 w-10 items-center justify-center rounded-lg text-gray-500 active:bg-gray-100"
          onClick={handleBackToList}
          aria-label="Back to stocktake list"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h1 className="screen-header-title">Stocktake</h1>
        <div className="w-10" />
      </div>

      <div className="screen-body flex flex-col">
        {/* Search bar */}
        <input
          className="input-field mb-3"
          placeholder="Filter items..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
        />

        {/* Progress */}
        <div className="mb-3 flex items-center justify-between text-sm text-gray-500">
          <span>
            {countedCount} of {aggregatedItems.length} items counted
          </span>
          {aggregatedItems.length > 0 && (
            <span>
              {Math.round((countedCount / aggregatedItems.length) * 100)}%
            </span>
          )}
        </div>

        {error && (
          <div className="mb-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loadingLines ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-200 border-t-primary-600" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-2">
              {filteredItems.map((item) => {
                const isCounted = item.countedQty !== null;
                const stock = Math.round(item.currentStock);
                const counted =
                  item.countedQty !== null
                    ? Math.round(item.countedQty)
                    : null;

                return (
                  <div
                    key={item.itemId}
                    className={`card ${isCounted ? "opacity-60" : ""}`}
                  >
                    {/* Item name + unit */}
                    <p className="text-sm font-medium leading-tight">
                      {item.itemName}
                    </p>
                    {item.unitName && (
                      <p className="mt-0.5 text-xs text-gray-400">
                        {item.unitName}
                      </p>
                    )}

                    {/* Stock / Counted row */}
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Stock on hand:{" "}
                        <span className="font-medium text-gray-700">
                          {stock}
                        </span>
                      </span>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">
                          Counted:
                        </span>
                        {editingItemId === item.itemId ? (
                          <input
                            className="w-20 rounded-lg border border-primary-300 px-2 py-1.5 text-center text-sm font-medium"
                            type="number"
                            inputMode="numeric"
                            value={editQty}
                            onChange={(e) => setEditQty(e.target.value)}
                            onBlur={() => handleCountSubmit(item)}
                            onKeyDown={(e) =>
                              e.key === "Enter" &&
                              handleCountSubmit(item)
                            }
                            autoFocus
                          />
                        ) : (
                          <button
                            className={`min-w-[3.5rem] rounded-lg px-3 py-1.5 text-sm font-semibold ${
                              isCounted
                                ? "bg-green-50 text-green-700"
                                : "bg-primary-50 text-primary-700"
                            }`}
                            onClick={() => {
                              setEditingItemId(item.itemId);
                              setEditQty(
                                isCounted ? String(counted) : ""
                              );
                            }}
                          >
                            {isCounted ? counted : "—"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Finalise button */}
        <div className="mt-4 pb-2">
          {confirmFinalise ? (
            <div className="space-y-2">
              <p className="text-center text-sm text-gray-600">
                This will adjust stock for all counted items. Continue?
              </p>
              <div className="flex gap-2">
                <button
                  className="btn-secondary flex-1"
                  onClick={() => setConfirmFinalise(false)}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary flex-1"
                  onClick={handleFinalise}
                  disabled={finalising}
                >
                  {finalising ? "Finalising..." : "Confirm"}
                </button>
              </div>
            </div>
          ) : (
            <button
              className="btn-primary"
              onClick={() => setConfirmFinalise(true)}
              disabled={countedCount === 0}
            >
              Finalise Stocktake
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
