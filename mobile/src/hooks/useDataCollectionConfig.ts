import { useState, useEffect, useCallback } from "react";
import { useAppPreferences } from "./useAppPreferences";
import {
  DataCollectionConfig,
  DataCollectionScreen,
  DataCollectionField,
  DEFAULT_CONFIG,
} from "../types/dataCollection";

const CONFIG_KEY = "data_collection_config";

export function useDataCollectionConfig() {
  const prefs = useAppPreferences();
  const [config, setConfig] = useState<DataCollectionConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  // Load from store on mount, writing default if nothing saved yet
  useEffect(() => {
    prefs.get<DataCollectionConfig>(CONFIG_KEY).then((saved) => {
      if (saved) {
        setConfig(saved);
      } else {
        prefs.set(CONFIG_KEY, DEFAULT_CONFIG);
      }
      setLoading(false);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const persist = useCallback(
    async (next: DataCollectionConfig) => {
      setConfig(next);
      await prefs.set(CONFIG_KEY, next);
    },
    [prefs]
  );

  // ── Screens ────────────────────────────────────────────────────────────────

  const getScreensSorted = useCallback(
    () => [...config.screens].sort((a, b) => a.order - b.order),
    [config.screens]
  );

  const addScreen = useCallback(
    async (name: string) => {
      const maxOrder = config.screens.reduce(
        (m, s) => Math.max(m, s.order),
        0
      );
      const newScreen: DataCollectionScreen = {
        id: config.nextId,
        order: maxOrder + 1,
        name,
      };
      await persist({
        ...config,
        screens: [...config.screens, newScreen],
        nextId: config.nextId + 1,
      });
      return newScreen;
    },
    [config, persist]
  );

  const updateScreen = useCallback(
    async (id: number, updates: Partial<Omit<DataCollectionScreen, "id">>) => {
      await persist({
        ...config,
        screens: config.screens.map((s) =>
          s.id === id ? { ...s, ...updates } : s
        ),
      });
    },
    [config, persist]
  );

  const deleteScreen = useCallback(
    async (id: number) => {
      await persist({
        ...config,
        screens: config.screens.filter((s) => s.id !== id),
        fields: config.fields.filter((f) => f.screenId !== id),
      });
    },
    [config, persist]
  );

  // ── Fields ─────────────────────────────────────────────────────────────────

  const getFieldsForScreen = useCallback(
    (screenId: number) =>
      config.fields
        .filter((f) => f.screenId === screenId)
        .sort((a, b) => a.order - b.order),
    [config.fields]
  );

  const addField = useCallback(
    async (field: Omit<DataCollectionField, "id">) => {
      const newField: DataCollectionField = { ...field, id: config.nextId };
      await persist({
        ...config,
        fields: [...config.fields, newField],
        nextId: config.nextId + 1,
      });
      return newField;
    },
    [config, persist]
  );

  const updateField = useCallback(
    async (
      id: number,
      updates: Partial<Omit<DataCollectionField, "id" | "screenId">>
    ) => {
      await persist({
        ...config,
        fields: config.fields.map((f) =>
          f.id === id ? { ...f, ...updates } : f
        ),
      });
    },
    [config, persist]
  );

  const deleteField = useCallback(
    async (id: number) => {
      await persist({
        ...config,
        fields: config.fields.filter((f) => f.id !== id),
      });
    },
    [config, persist]
  );

  return {
    config,
    loading,
    getScreensSorted,
    getFieldsForScreen,
    addScreen,
    updateScreen,
    deleteScreen,
    addField,
    updateField,
    deleteField,
  };
}
