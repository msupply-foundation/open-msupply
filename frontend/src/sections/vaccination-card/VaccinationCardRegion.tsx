import { createResource, createSignal, Show, type Component } from 'solid-js';
import { gated } from '@/api/gated';
import { fetchCard, fetchCardPatient } from './cardApi';
import { opensInEncounter, type CardRow } from './cardModel';
import { VaccinationCardTable } from './VaccinationCardTable';
import { DoseEditorDialog } from './DoseEditorDialog';

export interface VaccinationCardRegionProps {
  storeId: string;
  encounterId: string;
  patientId: string;
  programEnrolmentId: string;
  /**
   * The encounter's clinician — a new dose's default (rules § recording a
   * dose).
   */
  encounterClinicianId: string | null;
  /**
   * A dose was saved: the host's own effects (rules § effects on the
   * encounter).
   */
  onDoseSaved?: () => void;
}

/*
 * S2 — the card inside an immunisation encounter (spec/vaccination-card
 * ui-surface § S2): the card's notices and table, a dose opening the dose
 * editor (S3) where the rules allow. Each save is its own write, separate
 * from the encounter's own Save; a landed save refreshes the card by a direct
 * refetch.
 *
 * Mounted by the encounter record screen once its record has loaded, under
 * that screen's boundary — so the card's reads are gated, never suspending.
 */
export const VaccinationCardRegion: Component<
  VaccinationCardRegionProps
> = props => {
  const [cardData, { refetch }] = createResource(
    () => ({
      storeId: props.storeId,
      programEnrolmentId: props.programEnrolmentId,
    }),
    fetchCard
  );
  const [patientData] = createResource(
    () => ({ storeId: props.storeId, patientId: props.patientId }),
    fetchCardPatient
  );
  const rows = () => gated(cardData)?.rows ?? [];
  const [opened, setOpened] = createSignal<CardRow>();

  return (
    <div data-testid="vaccination-card">
      <VaccinationCardTable
        rows={rows()}
        reasons={gated(cardData)?.reasons ?? {}}
        loading={cardData.loading}
        hasDateOfBirth={!!gated(patientData)?.patient?.dateOfBirth}
        onOpenDose={setOpened}
        doseOpens={row => opensInEncounter(rows(), row)}
      />
      <Show when={opened()}>
        {row => (
          <DoseEditorDialog
            storeId={props.storeId}
            encounterId={props.encounterId}
            encounterClinicianId={props.encounterClinicianId}
            row={row()}
            rows={rows()}
            onClose={() => setOpened(undefined)}
            onSaved={() => {
              setOpened(undefined);
              void refetch();
              props.onDoseSaved?.();
            }}
          />
        )}
      </Show>
    </div>
  );
};
