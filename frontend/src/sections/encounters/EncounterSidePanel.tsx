import {
  createResource,
  createSignal,
  For,
  Show,
  type Component,
} from 'solid-js';
import { t, localisedDate } from '../../intl';
import { gated } from '../../api/gated';
import { authUser, userDisplayName } from '../../auth/authContext';
import {
  SidePanelActions,
  SidePanelSection,
} from '../../ui/layout/SidePanel/SidePanel';
import { FieldRow } from '../../ui/elements/inputs/FieldRow';
import { TextArea } from '../../ui/elements/inputs/TextArea';
import { UserLabel } from '../../ui/elements/typography/UserLabel';
import { RecordLink } from '../../ui/elements/typography/RecordLink';
import { Text } from '../../ui/elements/typography/Text';
import { StatusChip } from '../../ui/elements/feedback/StatusChip';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog';
import { Button } from '../../ui/elements/buttons/Button';
import { TrashIcon } from '../../ui/icons';
import type { Draft } from '../../domain/documentForm/draft';
import { withFirstNoteText } from '../../domain/documentForm/notes';
import { encounterStatusChip } from '../../domain/encounter/encounterStatus';
import type { Encounter } from '../../plugin-sdk/documents';
import { fetchPreviousEncounters } from './encounterPrevious';
import styles from './EncounterSidePanel.module.css';

export interface EncounterSidePanelProps {
  storeId: string;
  encounterId: string;
  patientId: string;
  /** The encounter's type, which its previous encounters share. */
  type: string;
  /**
   * The encounter's visit date as stored: its previous encounters are the
   * patient's earlier ones of the type.
   */
  startDatetime: string | undefined;
  draft: Draft<Encounter>;
  /**
   * Whether the form renders the encounter's notes itself (a plugin form's
   * notes list, with its own rules on which notes may still be edited; the
   * default form's box): the panel's Notes then stands down.
   */
  formEditsNotes: boolean;
  /** Whether the user may change the encounter (so may delete it). */
  canMutate: boolean;
  /**
   * Deletes the encounter: the screen writes the stored document as Deleted,
   * then leaves for the patient.
   */
  onDelete: () => void;
}

/*
 * The encounter screen's side panel (Product's program-enrolment prototype;
 * ui/docs/SIDE_PANEL.md), the old client's details panel: who entered the
 * encounter and when, its notes, the patient's previous encounters of the
 * type, and Delete. Entered by and Entered on are the document's own
 * createdBy and createdDatetime. Notes edits the draft's first note, but
 * only where no form field renders the notes: a form that does owns them,
 * with whatever rules it applies to written notes, and a second box over
 * the same note would bypass those.
 */
export const EncounterSidePanel: Component<EncounterSidePanelProps> = props => {
  const [confirmingDelete, setConfirmingDelete] = createSignal(false);

  // Read non-suspending: the panel mounts with the open screen, and this read
  // must never remount it (kdd/solid-reactivity-pitfalls › no remounts on
  // interaction). It re-reads when the screen moves to another encounter.
  const [previousData] = createResource(
    () =>
      props.startDatetime
        ? {
            storeId: props.storeId,
            patientId: props.patientId,
            type: props.type,
            encounterId: props.encounterId,
            before: props.startDatetime,
          }
        : undefined,
    fetchPreviousEncounters
  );
  const previous = () => gated(previousData);

  const patientEncountersHref = () =>
    `/${props.storeId}/dispensary/patients/${props.patientId}?tab=encounters`;

  const deleted = () => props.draft.data.status === 'DELETED';

  return (
    <>
      <SidePanelSection
        value="additional-info"
        title={t('heading.additional-info')}
        collapsible
      >
        <FieldRow label={t('label.entered-by')}>
          <UserLabel
            username={props.draft.data.createdBy?.username}
            label={t('label.entered-by')}
            testId="encounter-entered-by"
          />
        </FieldRow>
        <FieldRow
          label={t('label.entered-on')}
          readOnly
          valueTestId="encounter-entered-on"
        >
          {props.draft.data.createdDatetime
            ? localisedDate(props.draft.data.createdDatetime)
            : '—'}
        </FieldRow>
        <Show when={!props.formEditsNotes}>
          <FieldRow label={t('label.notes')} align="first-line">
            <TextArea
              label={t('label.notes')}
              hideLabel
              rows={3}
              value={props.draft.data.notes?.[0]?.text ?? ''}
              onInput={e =>
                props.draft.set(
                  'notes',
                  withFirstNoteText(
                    props.draft.data.notes,
                    e.currentTarget.value,
                    { id: authUser()?.userId, name: userDisplayName() },
                    new Date().toISOString()
                  )
                )
              }
              disabled={props.draft.readOnly()}
              data-testid="encounter-panel-notes"
            />
          </FieldRow>
        </Show>
      </SidePanelSection>

      <SidePanelSection
        value="previous-encounters"
        title={t('label.previous-encounters')}
        collapsible
      >
        <Show when={previous()} fallback={<Spinner sizeRem={1.25} />}>
          {list => (
            <Show
              when={list().rows.length > 0}
              fallback={
                <Text variant="bodySmall" data-testid="encounter-previous-none">
                  {t('messages.no-previous-encounters')}
                </Text>
              }
            >
              <ul class={styles.previousList}>
                <For each={list().rows}>
                  {row => {
                    const chip = () =>
                      encounterStatusChip(
                        row.status,
                        row.startDatetime,
                        new Date()
                      );
                    return (
                      <li class={styles.previousRow}>
                        <RecordLink
                          href={`/${props.storeId}/dispensary/encounter/${row.id}`}
                          testId="encounter-previous-link"
                        >
                          {localisedDate(row.startDatetime)}
                        </RecordLink>
                        <Show when={chip()}>
                          {chip => (
                            <StatusChip
                              label={chip().label}
                              colour={chip().colour}
                            />
                          )}
                        </Show>
                      </li>
                    );
                  }}
                </For>
                <Show when={list().more}>
                  <li class={styles.previousRow}>
                    <RecordLink
                      href={patientEncountersHref()}
                      testId="encounter-previous-more"
                    >
                      {t('label.more')}
                    </RecordLink>
                  </li>
                </Show>
              </ul>
            </Show>
          )}
        </Show>
      </SidePanelSection>

      <Show when={props.canMutate}>
        <SidePanelSection value="actions" title={t('heading.actions')}>
          <SidePanelActions>
            <Button
              variant="danger"
              icon={<TrashIcon />}
              disabled={deleted() || props.draft.readOnly()}
              data-testid="delete-encounter-button"
              onClick={() => setConfirmingDelete(true)}
            >
              {t('button.delete')}
            </Button>
          </SidePanelActions>
        </SidePanelSection>
      </Show>

      <ConfirmDialog
        open={confirmingDelete()}
        title={t('title.confirm-delete-encounter')}
        message={t('message.confirm-delete-encounter')}
        confirmLabel={t('button.delete')}
        confirmVariant="danger"
        onConfirm={() => {
          setConfirmingDelete(false);
          props.onDelete();
        }}
        onClose={() => setConfirmingDelete(false)}
      />
    </>
  );
};
