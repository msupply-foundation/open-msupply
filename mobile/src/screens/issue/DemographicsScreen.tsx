import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMutation, useLazyQuery } from "@apollo/client";
import { v4 as uuid } from "uuid";
import BackButton from "../../components/BackButton";
import { useAuth } from "../../hooks/useAuth";
import { useAppPreferences, PREF_KEYS } from "../../hooks/useAppPreferences";
import {
  INSERT_PRESCRIPTION,
  UPDATE_PRESCRIPTION,
  SAVE_PRESCRIPTION_ITEM_LINES,
  STOCK_LINES_FOR_ITEM,
} from "../../api/graphql/operations";
import type { PrescriptionItem } from "./IssueScreen";

const GENDERS = ["Male", "Female"] as const;
const AGE_GROUPS_BASE = ["0-11 months", "12-23 months", "24-59 months"] as const;
const SERVICE_MODES = ["Fixed", "Mobile", "Outreach"] as const;

type Gender = (typeof GENDERS)[number];
type ServiceMode = (typeof SERVICE_MODES)[number];

interface LocationState {
  prescriptionId: string;
  items: PrescriptionItem[];
  existingItems: PrescriptionItem[];
}

export default function DemographicsScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const { storeId } = useAuth();
  const prefs = useAppPreferences();

  const locState = location.state as LocationState;
  const { prescriptionId, items, existingItems } = locState ?? {};

  const [gender, setGender] = useState<Gender | null>(null);
  const [ageGroup, setAgeGroup] = useState<string | null>(null);
  const [serviceMode, setServiceMode] = useState<ServiceMode | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [insertPrescription] = useMutation(INSERT_PRESCRIPTION);
  const [updatePrescription] = useMutation(UPDATE_PRESCRIPTION);
  const [savePrescriptionLines] = useMutation(SAVE_PRESCRIPTION_ITEM_LINES);
  const [stockLinesQuery] = useLazyQuery(STOCK_LINES_FOR_ITEM);

  // "Women" age group only available when gender is Female
  const ageGroups =
    gender === "Female"
      ? [...AGE_GROUPS_BASE, "Women"]
      : AGE_GROUPS_BASE;

  // Clear age group selection if switching from Female to Male while Women is selected
  const handleGenderSelect = (g: Gender) => {
    setGender(g);
    if (g === "Male" && ageGroup === "Women") {
      setAgeGroup(null);
    }
  };

  const canFinish =
    gender !== null && ageGroup !== null && serviceMode !== null;

  const subtitle = items?.map((i) => i.itemName).join(", ") ?? "";

  const handleCancel = () => {
    // Go back to issue screen, restoring the item list
    navigate("/issue", { state: { existingItems } });
  };

  const handleFinish = async () => {
    if (!canFinish || !storeId) return;

    setFinishing(true);
    setError(null);

    try {
      const patientId = await prefs.get<string>(PREF_KEYS.NAME_ID);
      if (!patientId) throw new Error("No patient set");

      const comment = `${gender}|${ageGroup}|${serviceMode}`;

      // 1. Create the prescription
      await insertPrescription({
        variables: { storeId, id: prescriptionId, patientId },
      });

      // 2. For each item: FEFO stock allocation + save lines
      for (const item of items) {
        const { data } = await stockLinesQuery({
          variables: { storeId, itemId: item.itemId },
          fetchPolicy: "network-only",
        });

        const stockNodes = data?.stockLines?.nodes ?? [];
        if (stockNodes.length === 0) continue;

        const lines: { id: string; stockLineId: string; numberOfPacks: number }[] = [];
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

      // 3. Set status PICKED and save demographics as comment
      await updatePrescription({
        variables: {
          storeId,
          input: { id: prescriptionId, status: "PICKED", comment },
        },
      });

      // Success — back to a fresh issue screen
      navigate("/issue", { state: {} });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create prescription"
      );
      setFinishing(false);
    }
  };

  return (
    <div className="screen-container">
      <div className="screen-header">
        <BackButton onClick={handleCancel} />
        <div className="flex-1 min-w-0 text-center">
          <h1 className="screen-header-title">Demographics</h1>
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

        {/* Gender */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Gender
          </p>
          <div className="grid grid-cols-2 gap-3">
            {GENDERS.map((g) => (
              <button
                key={g}
                onClick={() => handleGenderSelect(g)}
                className={`rounded-xl py-3 text-center font-medium transition-colors ${
                  gender === g
                    ? "bg-primary-600 text-white"
                    : "border border-gray-200 bg-white text-gray-700 active:bg-gray-50"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </section>

        {/* Age Group */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Age Group
          </p>
          <div className="grid grid-cols-2 gap-3">
            {ageGroups.map((ag) => (
              <button
                key={ag}
                onClick={() => setAgeGroup(ag)}
                className={`rounded-xl py-3 text-center font-medium transition-colors ${
                  ageGroup === ag
                    ? "bg-primary-600 text-white"
                    : "border border-gray-200 bg-white text-gray-700 active:bg-gray-50"
                }`}
              >
                {ag}
              </button>
            ))}
          </div>
        </section>

        {/* Service Mode */}
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Service Mode
          </p>
          <div className="grid grid-cols-3 gap-3">
            {SERVICE_MODES.map((sm) => (
              <button
                key={sm}
                onClick={() => setServiceMode(sm)}
                className={`rounded-xl py-3 text-center font-medium transition-colors ${
                  serviceMode === sm
                    ? "bg-primary-600 text-white"
                    : "border border-gray-200 bg-white text-gray-700 active:bg-gray-50"
                }`}
              >
                {sm}
              </button>
            ))}
          </div>
        </section>
      </div>

      {/* Bottom action bar */}
      <div className="flex gap-3 border-t border-gray-100 bg-white px-4 py-3">
        <button className="btn-secondary flex-1" onClick={handleCancel}>
          Cancel
        </button>
        <button
          className="btn-primary flex-1"
          onClick={handleFinish}
          disabled={!canFinish || finishing}
        >
          {finishing ? "Saving..." : "Finished & Next ✓"}
        </button>
      </div>
    </div>
  );
}
