import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const TILES = [
  {
    label: "Issue Stock",
    description: "Scan items to create outbound shipments",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    path: "/issue",
    requiresNameId: true,
  },
  {
    label: "Receive Stock",
    description: "Review and accept inbound shipments",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0l-4-4m-8 4l4 4" />
      </svg>
    ),
    path: "/receive",
    requiresNameId: false,
  },
  {
    label: "Stocktake",
    description: "Count and adjust stock levels",
    icon: (
      <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    path: "/stocktake",
    requiresNameId: false,
  },
];

export default function HomeScreen() {
  const navigate = useNavigate();
  const { storeName, nameId, logout } = useAuth();

  return (
    <div className="screen-container">
      <div className="screen-header justify-between">
        <div>
          <h1 className="text-lg font-semibold">mSupply Mobile</h1>
          <p className="text-xs text-gray-500">{storeName}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/settings")}
            className="rounded-lg p-2 text-gray-600 active:bg-gray-100"
            aria-label="Settings"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-gray-600 active:bg-gray-100"
            aria-label="Logout"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      <div className="screen-body">
        <div className="space-y-3">
          {TILES.map((tile) => {
            const disabled = tile.requiresNameId && !nameId;
            return (
              <button
                key={tile.path}
                onClick={() => !disabled && navigate(tile.path)}
                disabled={disabled}
                className={`card flex w-full items-center gap-4 text-left ${
                  disabled ? "opacity-50" : "active:bg-gray-50"
                }`}
              >
                <div
                  className={`rounded-lg p-3 ${
                    disabled
                      ? "bg-gray-100 text-gray-400"
                      : "bg-primary-50 text-primary-600"
                  }`}
                >
                  {tile.icon}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{tile.label}</p>
                  <p className="text-sm text-gray-500">{tile.description}</p>
                  {disabled && (
                    <p className="mt-1 text-xs text-red-500">
                      Set a patient name code in Settings first
                    </p>
                  )}
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
            );
          })}
        </div>
      </div>
    </div>
  );
}
