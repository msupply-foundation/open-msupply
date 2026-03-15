import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

interface StoreInfo {
  id: string;
  code: string;
  name: string;
}

export default function LoginScreen() {
  const navigate = useNavigate();
  const { login, selectStore, serverUrl } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingStores, setPendingStores] = useState<StoreInfo[] | null>(null);

  const canLogin = !!serverUrl && !!username.trim() && !!password.trim();

  const handleLogin = async () => {
    if (!canLogin) return;

    setError("");
    setLoading(true);

    try {
      const result = await login(username, password);
      if (!result.success) {
        setError(result.error ?? "Login failed");
      } else if (result.stores && result.stores.length > 1) {
        setPendingStores(result.stores);
      } else {
        navigate("/home", { replace: true });
      }
    } catch {
      setError("Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleStoreSelect = async (store: StoreInfo) => {
    await selectStore(store);
    navigate("/home", { replace: true });
  };

  if (pendingStores) {
    return (
      <div className="screen-container">
        <div className="screen-header">
          <h1 className="screen-header-title">Select Store</h1>
        </div>
        <div className="screen-body space-y-2">
          <p className="mb-4 text-sm text-gray-500">
            Choose the store you want to work with:
          </p>
          {pendingStores.map((store) => (
            <button
              key={store.id}
              onClick={() => handleStoreSelect(store)}
              className="card w-full text-left active:bg-gray-50"
            >
              <p className="font-medium">{store.name}</p>
              <p className="text-sm text-gray-500">{store.code}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container">
      <div className="flex flex-1 flex-col justify-center px-6">
        <div className="mb-8 text-center">
          <h1 className="mb-1 text-2xl font-bold text-primary-700">
            mSupply Mobile
          </h1>
          {serverUrl ? (
            <p className="text-sm text-gray-500">Server: {serverUrl}</p>
          ) : (
            <p className="text-sm text-amber-600">No server configured</p>
          )}
        </div>

        {!serverUrl && (
          <div className="mb-6 rounded-lg bg-amber-50 px-4 py-3 text-center">
            <p className="text-sm text-amber-800">
              Configure a server connection before signing in.
            </p>
            <button
              onClick={() => navigate("/settings")}
              className="mt-2 text-sm font-semibold text-primary-600"
            >
              Open Settings
            </button>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label
              htmlFor="username"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Username
            </label>
            <input
              id="username"
              type="text"
              className="input-field"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoCapitalize="none"
              disabled={loading || !serverUrl}
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              disabled={loading || !serverUrl}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            className="btn-primary"
            onClick={handleLogin}
            disabled={loading || !canLogin}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </div>

        <button
          onClick={() => navigate("/settings")}
          className="mt-6 text-center text-sm text-primary-600"
        >
          Server Settings
        </button>
      </div>
    </div>
  );
}
