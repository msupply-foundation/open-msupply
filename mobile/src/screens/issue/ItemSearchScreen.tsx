import { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLazyQuery } from "@apollo/client";
import BackButton from "../../components/BackButton";
import { useAuth } from "../../hooks/useAuth";
import { ITEMS_SEARCH } from "../../api/graphql/operations";

interface ItemResult {
  id: string;
  name: string;
  code: string;
  stats?: {
    availableStockOnHand: number;
  };
}

export default function ItemSearchScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { storeId } = useAuth();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const [searchItems] = useLazyQuery(ITEMS_SEARCH);

  const locState = location.state as {
    barcode?: string;
    existingItems?: unknown[];
  } | null;
  const barcode = locState?.barcode;
  const existingItems = locState?.existingItems;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      if (!storeId) return;

      setSearching(true);
      try {
        const { data } = await searchItems({
          variables: { storeId, search: query.trim() },
        });
        setResults(data?.items?.nodes ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, storeId, searchItems]);

  const handleSelect = (item: ItemResult) => {
    const availableStock = item.stats?.availableStockOnHand ?? 0;
    // Navigate back to issue screen, preserving existing items
    navigate("/issue", {
      state: {
        selectedItem: {
          id: item.id,
          name: item.name,
          availableStock,
        },
        existingItems,
      },
    });
  };

  return (
    <div className="screen-container">
      <div className="screen-header">
        <BackButton />
        <h1 className="screen-header-title">Search Items</h1>
        <div className="w-10" />
      </div>

      <div className="px-4 py-3">
        {barcode && (
          <p className="mb-2 text-sm text-yellow-600">
            Barcode "{barcode}" not found. Search for the item manually:
          </p>
        )}
        <input
          className="input-field"
          placeholder="Search by name or code..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {searching && (
          <p className="py-4 text-center text-sm text-gray-400">
            Searching...
          </p>
        )}

        {!searching && results.length === 0 && query.trim().length >= 2 && (
          <p className="py-4 text-center text-sm text-gray-400">
            No items found
          </p>
        )}

        <div className="space-y-1">
          {results.map((item) => {
            const stock = item.stats?.availableStockOnHand ?? 0;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item)}
                className="w-full rounded-lg px-3 py-3 text-left active:bg-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.code}</p>
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      stock > 0 ? "text-green-600" : "text-red-500"
                    }`}
                  >
                    {stock} avail
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
