import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import BackButton from "../../components/BackButton";
import { useDataCollectionConfig } from "../../hooks/useDataCollectionConfig";
import {
  DataCollectionField,
  FieldType,
  FIELD_TYPE_LABELS,
} from "../../types/dataCollection";

const FIELD_TYPES = Object.keys(FIELD_TYPE_LABELS) as FieldType[];
const CHOICE_TYPES: FieldType[] = ["choice_buttons", "choice_dropdown"];

type EditingField = Omit<DataCollectionField, "id" | "screenId"> & {
  id?: number; // undefined = new field
};

const BLANK_FIELD: EditingField = {
  label: "",
  order: 1,
  type: "choice_buttons",
  required: true,
  choices: [],
  defaultValue: null,
};

export default function ScreenFieldsScreen() {
  const navigate = useNavigate();
  const { screenId: screenIdParam } = useParams<{ screenId: string }>();
  const screenId = Number(screenIdParam);

  const {
    config,
    loading,
    getFieldsForScreen,
    updateScreen,
    deleteScreen,
    addField,
    updateField,
    deleteField,
  } = useDataCollectionConfig();

  const screen = config.screens.find((s) => s.id === screenId);

  // Screen-level editable state
  const [name, setName] = useState("");
  const [order, setOrder] = useState("");

  useEffect(() => {
    if (screen) {
      setName(screen.name);
      setOrder(String(screen.order));
    }
  }, [screen]);

  // Field editor panel
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [newChoiceLabel, setNewChoiceLabel] = useState("");

  if (loading) {
    return (
      <div className="screen-container">
        <div className="screen-header">
          <BackButton to="/settings/data-collection" />
          <h1 className="screen-header-title">Loading…</h1>
          <div className="w-10" />
        </div>
      </div>
    );
  }

  if (!screen) {
    return (
      <div className="screen-container">
        <div className="screen-header">
          <BackButton to="/settings/data-collection" />
          <h1 className="screen-header-title">Not found</h1>
          <div className="w-10" />
        </div>
      </div>
    );
  }

  const fields = getFieldsForScreen(screenId);

  // ── Screen save helpers ───────────────────────────────────────────────────

  const handleSaveName = async () => {
    if (name.trim()) await updateScreen(screenId, { name: name.trim() });
  };

  const handleSaveOrder = async () => {
    const n = parseInt(order, 10);
    if (!isNaN(n)) await updateScreen(screenId, { order: n });
  };

  const handleDeleteScreen = async () => {
    await deleteScreen(screenId);
    navigate("/settings/data-collection");
  };

  // ── Field editor helpers ──────────────────────────────────────────────────

  const openNewField = () => {
    const maxOrder = fields.reduce((m, f) => Math.max(m, f.order), 0);
    setEditingField({ ...BLANK_FIELD, order: maxOrder + 1 });
    setNewChoiceLabel("");
  };

  const openEditField = (field: DataCollectionField) => {
    setEditingField({
      id: field.id,
      label: field.label,
      order: field.order,
      type: field.type,
      required: field.required,
      choices: field.choices ? [...field.choices] : [],
      defaultValue: field.defaultValue ?? null,
    });
    setNewChoiceLabel("");
  };

  const closeEditor = () => {
    setEditingField(null);
    setNewChoiceLabel("");
  };

  const handleSaveField = async () => {
    if (!editingField || !editingField.label.trim()) return;

    const payload: Omit<DataCollectionField, "id"> = {
      screenId,
      label: editingField.label.trim(),
      order: editingField.order,
      type: editingField.type,
      required: editingField.required,
      choices: CHOICE_TYPES.includes(editingField.type)
        ? editingField.choices ?? []
        : undefined,
      defaultValue: CHOICE_TYPES.includes(editingField.type)
        ? editingField.defaultValue ?? null
        : null,
    };

    if (editingField.id !== undefined) {
      await updateField(editingField.id, payload);
    } else {
      await addField(payload);
    }
    closeEditor();
  };

  const addChoice = () => {
    const label = newChoiceLabel.trim();
    if (!label || !editingField) return;
    setEditingField((prev) =>
      prev
        ? {
            ...prev,
            choices: [
              ...(prev.choices ?? []),
              { label, value: label },
            ],
          }
        : prev
    );
    setNewChoiceLabel("");
  };

  const removeChoice = (idx: number) => {
    if (!editingField) return;
    const next = (editingField.choices ?? []).filter((_, i) => i !== idx);
    setEditingField((prev) =>
      prev
        ? {
            ...prev,
            choices: next,
            // clear defaultValue if it was this choice
            defaultValue:
              prev.defaultValue ===
              (editingField.choices ?? [])[idx]?.value
                ? null
                : prev.defaultValue,
          }
        : prev
    );
  };

  return (
    <div className="screen-container">
      <div className="screen-header">
        <BackButton to="/settings/data-collection" />
        <div className="flex-1 min-w-0 text-center">
          <h1 className="screen-header-title truncate">{screen.name}</h1>
          <p className="text-xs text-gray-400">id: {screen.id}</p>
        </div>
        <div className="w-10" />
      </div>

      <div className="screen-body space-y-4 overflow-y-auto pb-4">
        {/* Screen properties */}
        <section className="card space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Screen
          </h2>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-xs text-gray-500">Name</label>
              <input
                className="input-field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              />
            </div>
            <div className="w-20">
              <label className="mb-1 block text-xs text-gray-500">Order</label>
              <input
                className="input-field text-center"
                type="number"
                inputMode="numeric"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                onBlur={handleSaveOrder}
                onKeyDown={(e) => e.key === "Enter" && handleSaveOrder()}
              />
            </div>
          </div>
        </section>

        {/* Fields list */}
        <section className="card space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Fields
          </h2>

          {fields.length === 0 && (
            <p className="py-2 text-sm text-gray-400">No fields yet</p>
          )}

          <div className="space-y-1">
            {fields.map((field) => (
              <div
                key={field.id}
                className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2"
              >
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{field.label}</p>
                  <p className="text-xs text-gray-400">
                    {FIELD_TYPE_LABELS[field.type]}
                    {field.required && (
                      <span className="ml-2 text-primary-600">required</span>
                    )}
                  </p>
                </div>
                <button
                  className="rounded p-1 text-gray-400 active:bg-gray-200"
                  onClick={() => openEditField(field)}
                  aria-label="Edit field"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828A2 2 0 0110 16H8v-2a2 2 0 01.586-1.414z" />
                  </svg>
                </button>
                <button
                  className="rounded p-1 text-red-400 active:bg-red-50"
                  onClick={() => deleteField(field.id)}
                  aria-label="Delete field"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button className="btn-secondary mt-2" onClick={openNewField}>
            + Add Field
          </button>
        </section>

        {/* Delete screen */}
        <button className="btn-danger" onClick={handleDeleteScreen}>
          Delete Screen
        </button>
      </div>

      {/* ── Field editor panel (slide-up overlay) ───────────────────────── */}
      {editingField && (
        <>
          {/* Backdrop */}
          <div
            className="absolute inset-0 z-10 bg-black/40"
            onClick={closeEditor}
          />

          {/* Panel */}
          <div className="absolute bottom-0 left-0 right-0 z-20 max-h-[85%] overflow-y-auto rounded-t-2xl bg-white px-4 pb-6 pt-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold">
                {editingField.id !== undefined ? "Edit Field" : "New Field"}
              </h3>
              <button onClick={closeEditor} className="text-gray-400">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              {/* Label */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Label</label>
                <input
                  className="input-field"
                  placeholder="e.g. Gender"
                  value={editingField.label}
                  onChange={(e) =>
                    setEditingField((p) => p && { ...p, label: e.target.value })
                  }
                />
              </div>

              {/* Type */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Type</label>
                <select
                  className="input-field"
                  value={editingField.type}
                  onChange={(e) =>
                    setEditingField((p) =>
                      p ? { ...p, type: e.target.value as FieldType } : p
                    )
                  }
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {FIELD_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Order */}
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Order</label>
                <input
                  className="input-field"
                  type="number"
                  inputMode="numeric"
                  value={editingField.order}
                  onChange={(e) =>
                    setEditingField((p) =>
                      p ? { ...p, order: parseInt(e.target.value, 10) || 1 } : p
                    )
                  }
                />
              </div>

              {/* Required toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Required</span>
                <button
                  onClick={() =>
                    setEditingField((p) =>
                      p ? { ...p, required: !p.required } : p
                    )
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    editingField.required ? "bg-primary-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                      editingField.required ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Choices — only for choice types */}
              {CHOICE_TYPES.includes(editingField.type) && (
                <div>
                  <label className="mb-2 block text-xs font-medium text-gray-500">
                    Choices
                  </label>

                  <div className="mb-2 space-y-1">
                    {(editingField.choices ?? []).map((choice, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2"
                      >
                        <span className="flex-1 text-sm">{choice.label}</span>
                        <button
                          onClick={() => removeChoice(idx)}
                          className="text-red-400"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      className="input-field flex-1"
                      placeholder="Add choice…"
                      value={newChoiceLabel}
                      onChange={(e) => setNewChoiceLabel(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addChoice()}
                    />
                    <button
                      className="rounded-lg bg-primary-600 px-4 text-sm font-medium text-white active:bg-primary-700 disabled:bg-gray-300"
                      onClick={addChoice}
                      disabled={!newChoiceLabel.trim()}
                    >
                      Add
                    </button>
                  </div>

                  {/* Default value */}
                  {(editingField.choices ?? []).length > 0 && (
                    <div className="mt-3">
                      <label className="mb-1 block text-xs font-medium text-gray-500">
                        Default
                      </label>
                      <select
                        className="input-field"
                        value={editingField.defaultValue ?? ""}
                        onChange={(e) =>
                          setEditingField((p) =>
                            p
                              ? {
                                  ...p,
                                  defaultValue: e.target.value || null,
                                }
                              : p
                          )
                        }
                      >
                        <option value="">None</option>
                        {(editingField.choices ?? []).map((c) => (
                          <option key={c.value} value={c.value}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Save button */}
              <button
                className="btn-primary"
                onClick={handleSaveField}
                disabled={!editingField.label.trim()}
              >
                Save Field
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
