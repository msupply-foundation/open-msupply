import React, { FC, useState } from 'react';
import {
  DetailPanelSection,
  Grid,
  PanelLabel,
  PanelField,
  PanelRow,
  DetailPanelPortal,
  useTranslation,
  useFormatDateTime,
  TextArea,
  Link,
  RouteBuilder,
  InlineSpinner,
  useAuthContext,
  BasicTextInput,
  UNDEFINED_STRING_VALUE,
  DetailPanelAction,
  DeleteIcon,
  EncounterNodeStatus,
  useConfirmationModal,
} from '@openmsupply-client/common';
import {
  EncounterFragment,
  NoteSchema,
  useEncounter,
} from '@openmsupply-client/programs';
import { AppRoute } from '@openmsupply-client/config';

const NUM_RECENT_ENCOUNTERS = 5;

interface SidePanelProps {
  encounter: EncounterFragment;
  onChange: (
    patch: Partial<EncounterFragment> & {
      notes?: NoteSchema[];
      createdBy?: { username: string; id?: string };
    }
  ) => void;
  onDelete: () => void;
}

export const SidePanel: FC<SidePanelProps> = ({
  encounter,
  onChange,
  onDelete,
}) => {
  const [encounterNote, setEncounterNote] = useState(
    encounter.document.data?.notes?.[0]?.text ?? ''
  );
  const [createdBy, setCreatedBy] = useState(
    encounter?.document?.data?.createdBy?.username ?? UNDEFINED_STRING_VALUE
  );
  const { user } = useAuthContext();
  const { localisedDate } = useFormatDateTime();
  const t = useTranslation();

  const {
    data: otherEncounters,
    isError,
    isLoading,
  } = useEncounter.document.list({
    filterBy: {
      patientId: { equalTo: encounter.patient.id },
      type: { equalTo: encounter.type },
    },
    sortBy: {
      key: 'startDatetime',
      isDesc: true,
      direction: 'desc',
    },
    pagination: { first: NUM_RECENT_ENCOUNTERS },
  });

  const getDeleteConfirmation = useConfirmationModal({
    message: t('message.confirm-delete-encounter'),
    title: t('title.confirm-delete-encounter'),
  });

  const onDeleteClick = () => {
    getDeleteConfirmation({
      onConfirm: () => {
        onDelete();
      },
    });
  };

  return (
    <DetailPanelPortal
      Actions={
        <DetailPanelAction
          onClick={onDeleteClick}
          icon={<DeleteIcon />}
          title={t('label.delete')}
          disabled={encounter.status === EncounterNodeStatus.Deleted}
        />
      }
    >
      <DetailPanelSection title={t('label.additional-info')}>
        <Grid container gap={0.5} key="additional-info">
          <PanelRow>
            <PanelLabel>{t('label.entered-by')}</PanelLabel>
            <PanelField>
              <BasicTextInput
                value={createdBy}
                textAlign="right"
                InputProps={{ sx: { fontSize: 12 } }}
                onChange={e => {
                  setCreatedBy(e.target.value);
                  onChange({
                    createdBy: {
                      username: e.target.value,
                      id: user?.id ?? undefined,
                    },
                  });
                }}
              />
            </PanelField>
          </PanelRow>
          <PanelRow>
            <PanelLabel>{t('label.entered-on')}</PanelLabel>
            <PanelField>
              {localisedDate(encounter?.document?.data?.createdDatetime)}
            </PanelField>
          </PanelRow>
          <PanelRow>
            <PanelLabel>{t('label.visit-date')}</PanelLabel>
            <PanelField>{localisedDate(encounter.startDatetime)}</PanelField>
          </PanelRow>
          <PanelRow>
            <PanelLabel>{t('label.visit-notes')}</PanelLabel>
          </PanelRow>
          <PanelRow>
            <PanelLabel>
              <TextArea
                value={encounterNote}
                onChange={e => {
                  setEncounterNote(e.target.value);
                  onChange({
                    notes: [
                      {
                        text: e.target.value ?? '',
                        created: encounter.startDatetime,
                        authorId: user?.id,
                        authorName: user?.name,
                      },
                    ],
                  });
                }}
              />
            </PanelLabel>
          </PanelRow>
        </Grid>
      </DetailPanelSection>
      <DetailPanelSection title={t('label.previous-encounters')}>
        {isError ? (
          ''
        ) : isLoading ? (
          <InlineSpinner />
        ) : (
          otherEncounters?.nodes.map(enc => (
            <PanelRow key={enc.id}>
              <PanelLabel>
                <Link
                  to={RouteBuilder.create(AppRoute.Dispensary)
                    .addPart(AppRoute.Encounter)
                    .addPart(enc.id)
                    .build()}
                  target="_blank"
                  style={enc.id === encounter.id ? { fontWeight: 'bold' } : {}}
                >
                  {localisedDate(enc.startDatetime)}
                </Link>
              </PanelLabel>
            </PanelRow>
          ))
        )}
        {otherEncounters &&
        otherEncounters?.totalCount > NUM_RECENT_ENCOUNTERS ? (
          <PanelRow key={'more'}>
            <PanelLabel>
              <Link
                to={RouteBuilder.create(AppRoute.Dispensary)
                  .addPart(AppRoute.Patients)
                  .addPart(encounter.patient.id)
                  .addQuery({ tab: 'Encounters' })
                  .build()}
              >
                {t('label.more')}
              </Link>
            </PanelLabel>
          </PanelRow>
        ) : null}
      </DetailPanelSection>
    </DetailPanelPortal>
  );
};
