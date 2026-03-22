import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton";
import { useDataCollectionConfig } from "../../hooks/useDataCollectionConfig";

export default function DataCollectionListScreen() {
  const navigate = useNavigate();
  const { loading, getScreensSorted, getFieldsForScreen, addScreen } =
    useDataCollectionConfig();

  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const handleAdd = async () => {
    const name = newName.trim();
    if (!name) return;
    await addScreen(name);
    setNewName("");
    setAdding(false);
  };

  const screens = getScreensSorted();

  return (
    <div className="screen-container">
      <div className="screen-header">
        <BackButton to="/settings" />
        <h1 className="screen-header-title">Data Collection</h1>
        <div className="w-10" />
      </div>

      <div className="screen-body space-y-4">
        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          </div>
        ) : (
          <>
            {/* Screen list */}
            <div className="space-y-2">
              {screens.map((screen) => {
                const fieldCount = getFieldsForScreen(screen.id).length;
                return (
                  <button
                    key={screen.id}
                    onClick={() =>
                      navigate(`/settings/data-collection/${screen.id}`)
                    }
                    className="card w-full text-left active:bg-gray-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{screen.name}</p>
                        <p className="text-xs text-gray-400">
                          id: {screen.id} &nbsp;·&nbsp; order: {screen.order}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span>{fieldCount} field{fieldCount !== 1 ? "s" : ""}</span>
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </button>
                );
              })}

              {screens.length === 0 && (
                <p className="py-6 text-center text-sm text-gray-400">
                  No screens configured
                </p>
              )}
            </div>

            {/* Add screen */}
            {adding ? (
              <div className="card space-y-3">
                <p className="text-sm font-medium text-gray-700">New Screen Name</p>
                <input
                  className="input-field"
                  placeholder="e.g. Demographics"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    className="btn-secondary flex-1"
                    onClick={() => { setAdding(false); setNewName(""); }}
                  >
                    Cancel
                  </button>
                  <button
                    className="btn-primary flex-1"
                    onClick={handleAdd}
                    disabled={!newName.trim()}
                  >
                    Add
                  </button>
                </div>
              </div>
            ) : (
              <button
                className="btn-secondary"
                onClick={() => setAdding(true)}
              >
                + Add Screen
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
