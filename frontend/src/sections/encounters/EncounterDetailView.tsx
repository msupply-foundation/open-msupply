import {
  createMemo,
  createResource,
  Match,
  Show,
  Switch,
  type Component,
} from 'solid-js';
import { useNavigate, useParams } from '@solidjs/router';
import { graphqlFetch } from '../../api/graphql';
import { gated } from '../../api/gated';
import { t, localisedDate } from '../../intl';
import type { LocaleKey } from '../../intl/locales';
import { Page } from '../../ui/layout/Page/Page';
import { Header } from '../../ui/layout/Header/Header';
import { Breadcrumb } from '../../ui/layout/Header/Breadcrumb';
import { HeaderToolbar } from '../../ui/layout/Header/HeaderToolbar';
import { ContentContainer } from '../../ui/layout/ContentContainer/ContentContainer';
import { ContentFooter } from '../../ui/layout/ContentFooter/ContentFooter';
import { ContentFooterActions } from '../../ui/layout/ContentFooter/ContentFooterActions';
import { FormRowItem } from '../../ui/layout/Form/FormRowItem';
import { FormErrorSummary } from '../../ui/layout/Form/FormErrorSummary';
import { Button } from '../../ui/elements/buttons/Button';
import { Alert } from '../../ui/elements/feedback/Alert';
import { Spinner } from '../../ui/elements/feedback/Spinner';
import { ConfirmDialog } from '../../ui/elements/feedback/ConfirmDialog';
import { LabelledValue } from '../../ui/elements/typography/LabelledValue';
import { DateTimeField } from '../../ui/elements/inputs/DateTimeField';
import { Select } from '../../ui/elements/selectors/Select';
import { SaveIcon, XCircleIcon } from '../../ui/icons';
import { createConfirmOnLeave } from '../../domain/confirmOnLeave';
import { ClinicianSelect } from '../../domain/clinician';
import { createDocumentForm } from '../../domain/documentForm/createDocumentForm';
import type { Encounter, EncounterStatus } from '../../plugin-sdk/documents';
import {
  EncounterRecord,
  type EncounterRecordFragment,
} from './encounter.generated';

// The statuses a user can set. DELETED is a record's removal, not a visit's
// outcome, and has no place in the picker.
const STATUSES: readonly EncounterStatus[] = [
  'PENDING',
  'VISITED',
  'CANCELLED',
];

const statusLabel = (status: EncounterStatus): string =>
  t(`label.encounter-status-${status.toLowerCase()}` as LocaleKey);

const fetchEncounterRecord = async (variables: {
  storeId: string;
  id: string;
}): Promise<{ record: EncounterRecordFragment | undefined } | undefined> => {
  const result = await graphqlFetch(EncounterRecord, variables);
  if (result.kind !== 'success') return undefined;
  return { record: result.data.encounters.nodes[0] };
};

/*
 * The encounter record screen (kdd/custom-forms/specs.md § Forms in the UI:
 * the host record screen; implementation-plan H7). The host owns the route,
 * the frame, the toolbar and the save; the body is the encounter's form. The
 * toolbar's visit date, clinician and status and the body's fields edit one
 * draft, the document form host's, saved in one go by Save.
 *
 * Opened from a patient's Encounters row, and after "New encounter" creates
 * one whose visit is under way. Every read is non-suspending: the screen
 * shows its own spinner while the encounter and its document load.
 *
 * TO-DO: render the plugin's form for the encounter type when one is loaded
 * (implementation-plan H5, chunk 4), and write this screen's spec
 * (implementation-plan H26).
 */
const EncounterDetailView: Component = () => {
  const params = useParams<{ storeId: string; encounterId: string }>();
  const navigate = useNavigate();

  const [recordData] = createResource(
    () => ({ storeId: params.storeId, id: params.encounterId }),
    fetchEncounterRecord
  );
  const record = () => gated(recordData)?.record;

  const source = createMemo(
    () => {
      const name = record()?.document.name;
      return name ? { kind: 'existing' as const, name } : undefined;
    },
    undefined,
    { equals: (a, b) => a?.name === b?.name }
  );

  const form = createDocumentForm<Encounter>({
    storeId: () => params.storeId,
    patientId: () => record()?.patientId ?? '',
    source,
    labels: () => ({
      startDatetime: t('label.visit-date'),
      clinician: t('label.clinician'),
      status: t('label.status'),
    }),
  });
  const draft = form.draft;

  const patientHref = () =>
    `/${params.storeId}/dispensary/patients/${record()?.patientId ?? ''}?tab=encounters`;
  const leave = () => navigate(patientHref());

  const leaveGuard = createConfirmOnLeave({
    isDirty: form.isDirty,
    onDiscard: form.discard,
  });

  const typeName = () => form.registry()?.name ?? record()?.type ?? '';
  const crumbs = () => {
    const start = draft.data.startDatetime;
    const leaf = start
      ? `${typeName()} – ${localisedDate(start)}`
      : typeName() || t('label.encounter');
    return [
      {
        label: t('label.patients'),
        onClick: () => navigate(`/${params.storeId}/dispensary/patients`),
      },
      { label: record()?.patient.name ?? '', onClick: leave },
      { label: leaf },
    ];
  };

  const ready = () => form.status() === 'ready';

  return (
    <Switch>
      <Match
        when={gated(recordData) === undefined || form.status() === 'loading'}
      >
        <Spinner center />
      </Match>
      <Match when={!record() || form.status() === 'not-found'}>
        <Page
          header={
            <Header>
              <Breadcrumb crumbs={[{ label: t('label.encounter') }]} />
            </Header>
          }
        >
          <ContentContainer size="form" padded>
            <Alert severity="error">{t('messages.record-not-found')}</Alert>
          </ContentContainer>
        </Page>
      </Match>
      <Match when={ready() && form.library()}>
        {lib => {
          const Form = lib().DefaultEncounterForm;
          return (
            <Page
              header={
                <Header>
                  <Breadcrumb crumbs={crumbs()} />
                  <HeaderToolbar>
                    <FormRowItem weight={1.2}>
                      <LabelledValue
                        label={t('label.program')}
                        variant="field"
                        size="small"
                      >
                        {record()?.programEnrolment?.document.documentRegistry
                          ?.name || '—'}
                      </LabelledValue>
                    </FormRowItem>
                    <FormRowItem weight={0} minWidth="13rem">
                      <DateTimeField
                        label={t('label.visit-date')}
                        size="small"
                        value={draft.data.startDatetime ?? null}
                        onChange={v =>
                          draft.set('startDatetime', v ?? undefined)
                        }
                        required
                        error={draft.errorFor('startDatetime')}
                        disabled={draft.readOnly()}
                        testId="encounter-visit-date"
                      />
                    </FormRowItem>
                    <FormRowItem weight={1.5}>
                      <ClinicianSelect
                        label={t('label.clinician')}
                        size="small"
                        width="full"
                        value={draft.data.clinician?.id}
                        onChange={c =>
                          draft.set(
                            'clinician',
                            c
                              ? {
                                  id: c.id,
                                  firstName: c.firstName ?? undefined,
                                  lastName: c.lastName,
                                }
                              : undefined
                          )
                        }
                        disabled={draft.readOnly()}
                        inputTestId="encounter-clinician"
                      />
                    </FormRowItem>
                    <FormRowItem weight={1}>
                      <Select
                        label={t('label.status')}
                        size="small"
                        options={STATUSES.map(s => ({
                          value: s,
                          label: statusLabel(s),
                        }))}
                        value={draft.data.status}
                        onValueChange={v =>
                          draft.set('status', v as EncounterStatus)
                        }
                        error={draft.errorFor('status')}
                        disabled={draft.readOnly()}
                        testId="encounter-status"
                      />
                    </FormRowItem>
                  </HeaderToolbar>
                </Header>
              }
              contentFooter={
                <ContentFooter>
                  <ContentFooterActions>
                    <Button
                      variant="secondary"
                      icon={<XCircleIcon />}
                      data-testid="cancel-button"
                      onClick={leave}
                    >
                      {form.isDirty() ? t('button.cancel') : t('button.close')}
                    </Button>
                    <Button
                      icon={<SaveIcon />}
                      data-testid="save-button"
                      loading={form.saving()}
                      disabled={!form.canSave() || form.saving()}
                      onClick={() => void form.save()}
                    >
                      {t('button.save')}
                    </Button>
                  </ContentFooterActions>
                </ContentFooter>
              }
            >
              <ContentContainer size="form" padded>
                <Show when={form.saveError()}>
                  <Alert severity="error">{form.saveError()}</Alert>
                </Show>
                <Form draft={draft} />
                <FormErrorSummary
                  errors={form.validation.visible()}
                  testId="encounter-error-summary"
                />
              </ContentContainer>
              <ConfirmDialog
                open={leaveGuard.open()}
                title={t('heading.are-you-sure')}
                message={t('messages.discard-changes')}
                confirmLabel={t('button.discard')}
                onConfirm={leaveGuard.confirm}
                onClose={leaveGuard.cancel}
              />
            </Page>
          );
        }}
      </Match>
    </Switch>
  );
};

export default EncounterDetailView;
