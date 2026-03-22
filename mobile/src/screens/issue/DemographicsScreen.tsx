import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation, useLazyQuery } from "@apollo/client";
import { v4 as uuid } from "uuid";
import BackButton from "../../components/BackButton";
import { useAuth } from "../../hooks/useAuth";
import { useAppPreferences, PREF_KEYS } from "../../hooks/useAppPreferences";
import { useDataCollectionConfig } from "../../hooks/useDataCollectionConfig";
import {
  INSERT_PRESCRIPTION,
  UPDATE_PRESCRIPTION,
  SAVE_PRESCRIPTION_ITEM_LINES,
  STOCK_LINES_FOR_ITEM,
} from "../../api/graphql/operations";
import type { PrescriptionItem } from "./IssueScreen";
import { DataCollectionField, FieldType } from "../../types/dataCollection";

interface LocationState {
  prescriptionId: string;
  items: PrescriptionItem[];
  existingItems: PrescriptionItem[];
}

/** Compute columns for choice_buttons based on choice count */
function choiceGridCols(count: number): string {
  if (count <= 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-3";
  return "grid-cols-2";
}

/** Render a single field based on its type */
function FieldInput({
  field,
  value,
  onChange,
}: {
  field: DataCollectionField;
  value: string;
  onChange: (v: string) => void;
}) {
  const choices = field.choices ?? [];

  switch (field.type as FieldType) {
    case "choice_buttons":
      return (
        <div className={`grid gap-3 ${choiceGridCols(choices.length)}`}>
          {choices.map((c) => (
            <button
              key={c.value}
              onClick={() => onChange(value === c.value ? "" : c.value)}
              className={`rounded-xl py-3 text-center font-medium transition-colors ${
                value === c.value
                  ? "bg-primary-600 text-white"
                  : "border border-gray-200 bg-white text-gray-700 active:bg-gray-50"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      );

    case "choice_dropdown":
      return (
        <select
          className="input-field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select…</option>
          {choices.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      );

    case "numeric":
      return (
        <input
          type="number"
          inputMode="numeric"
          className="input-field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter number…"
        />
      );

    case "date":
      return (
        <input
          type="date"
          className="input-field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case "text":
    default:
      return (
        <input
          type="text"
          className="input-field"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter text…"
        />
      );
  }
}

export default function DemographicsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { storeId } = useAuth();
  const prefs = useAppPreferences();
  const { loading: configLoading, getScreensSorted, getFieldsForScreen } =
    useDataCollectionConfig();

  const locState = location.state as LocationState;
  const { prescriptionId, items, existingItems } = locState ?? {};

  const [currentScreenIdx, setCurrentScreenIdx] = useState(0);
  const [values, setValues] = useState<Record<number, string>>({});
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [insertPrescription] = useMutation(INSERT_PRESCRIPTION);
  const [updatePrescription] = useMutation(UPDATE_PRESCRIPTION);
  const [savePrescriptionLines] = useMutation(SAVE_PRESCRIPTION_ITEM_LINES);
  const [stockLinesQuery] = useLazyQuery(STOCK_LINES_FOR_ITEM);

  const sortedScreens = getScreensSorted();
  const currentScreen = sortedScreens[currentScreenIdx];
  const currentFields = currentScreen
    ? getFieldsForScreen(currentScreen.id)
    : [];

  const isLastScreen = currentScreenIdx === sortedScreens.length - 1;

  // Initialise values from defaultValues when config loads
  useEffect(() => {
    if (configLoading) return;
    const initial: Record<number, string> = {};
    for (const screen of sortedScreens) {
      for (const field of getFieldsForScreen(screen.id)) {
        if (field.defaultValue) {
          initial[field.id] = field.defaultValue;
        }
      }
    }
    setValues(initial);
  }, [configLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const setValue = (fieldId: number, val: string) => {
    setValues((prev) => ({ ...prev, [fieldId]: val }));
  };

  // All required fields on the current screen must have a value
  const currentScreenValid = currentFields
    .filter((f) => f.required)
    .every((f) => (values[f.id] ?? "").trim() !== "");

  const subtitle = items?.map((i) => i.itemName).join(", ") ?? "";

  const handleBack = () => {
    if (currentScreenIdx > 0) {
      setCurrentScreenIdx((i) => i - 1);
    } else {
      navigate("/issue", { state: { existingItems } });
    }
  };

  const handleCancel = () => {
    navigate("/issue", { state: { existingItems } });
  };

  const handleNext = () => {
    if (!currentScreenValid) return;
    setCurrentScreenIdx((i) => i + 1);
  };

  const handleFinish = async () => {
    if (!currentScreenValid || !storeId) return;

    setFinishing(true);
    setError(null);

    try {
      const patientId = await prefs.get<string>(PREF_KEYS.NAME_ID);
      if (!patientId) throw new Error("No patient set");

      // Build comment: Label:Value pairs across all screens in order
      const allFields = sortedScreens.flatMap((s) => getFieldsForScreen(s.id));
      const comment = allFields
        .filter((f) => (values[f.id] ?? "").trim() !== "")
        .map((f) => `${f.label}:${values[f.id]}`)
        .join("|");

      // 1. Create prescription
      await insertPrescription({
        variables: { storeId, id: prescriptionId, patientId },
      });

      // 2. FEFO allocate + save lines per item
      for (const item of items) {
        const { data } = await stockLinesQuery({
          variables: { storeId, itemId: item.itemId },
          fetchPolicy: "network-only",
        });

        const stockNodes = data?.stockLines?.nodes ?? [];
        if (stockNodes.length === 0) continue;

        const lines: { id: string; stockLineId: string; numberOfPacks: number }[] =
          [];
        let remaining = item.quantity;

        for (const sl of stockNodes) {
          if (remaining <= 0) break;
          const available = sl.availableNumberOfPacks ?? 0;
          if (available <= 0) continue;
          const take = Math.min(remaining, available);
          lines.push({ id: uuid(), stockLineId: sl.id, numberOfPacks: take });
          remaining -= take;
        }

        if (lines.length > 0) {
          await savePrescriptionLines({
            variables: {
              storeId,
              input: { invoiceId: prescriptionId, itemId: item.itemId, lines },
            },
          });
        }
      }

      // 3. Set PICKED + save demographics comment
      await updatePrescription({
        variables: {
          storeId,
          input: { id: prescriptionId, status: "PICKED", comment },
        },
      });

      navigate("/issue", { state: {} });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create prescription"
      );
      setFinishing(false);
    }
  };

  if (configLoading) {
    return (
      <div className="screen-container">
        <div className="screen-header">
          <BackButton onClick={handleBack} />
          <h1 className="screen-header-title">Loading…</h1>
          <div className="w-10" />
        </div>
      </div>
    );
  }

  if (sortedScreens.length === 0) {
    // No screens configured — skip straight to submit
    return (
      <div className="screen-container">
        <div className="screen-header">
          <BackButton onClick={handleBack} />
          <h1 className="screen-header-title">Demographics</h1>
          <div className="w-10" />
        </div>
        <div className="screen-body flex flex-col items-center justify-center gap-4">
          <p className="text-sm text-gray-400">
            No data collection screens configured.
          </p>
          <button className="btn-primary" onClick={handleFinish} disabled={finishing}>
            {finishing ? "Saving…" : "Finished & Next ✓"}
          </button>
          <button className="btn-secondary" onClick={handleCancel}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen-container">
      <div className="screen-header">
        <BackButton onClick={handleBack} />
        <div className="flex-1 min-w-0 text-center">
          <h1 className="screen-header-title">{currentScreen.name}</h1>
          {subtitle && (
            <p className="truncate text-xs text-gray-500 px-2">{subtitle}</p>
          )}
        </div>
        <div className="w-10" />
      </div>

      <div className="screen-body flex flex-col gap-6 overflow-y-auto">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {currentFields.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">
            No fields on this screen
          </p>
        ) : (
          currentFields.map((field) => (
            <section key={field.id}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {field.label}
                {!field.required && (
                  <span className="ml-1 normal-case text-gray-300">
                    (optional)
                  </span>
                )}
              </p>
              <FieldInput
                field={field}
                value={values[field.id] ?? ""}
                onChange={(v) => setValue(field.id, v)}
              />
            </section>
          ))
        )}
      </div>

      {/* Bottom action bar */}
      <div className="flex gap-3 border-t border-gray-100 bg-white px-4 py-3">
        <button className="btn-secondary flex-1" onClick={handleCancel}>
          Cancel
        </button>
        {isLastScreen ? (
          <button
            className="btn-primary flex-1"
            onClick={handleFinish}
            disabled={!currentScreenValid || finishing}
          >
            {finishing ? "Saving…" : "Finished & Next ✓"}
          </button>
        ) : (
          <button
            className="btn-primary flex-1"
            onClick={handleNext}
            disabled={!currentScreenValid}
          >
            Next ›
          </button>
        )}
      </div>
    </div>
  );
}
