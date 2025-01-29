import React, { useState } from 'react';
import {
  DialogButton,
  EncounterNodeStatus,
  RouteBuilder,
  Stack,
  useDialog,
  useNavigate,
  useNotification,
  useAuthContext,
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import {
  useEncounter,
  EncounterSchema,
  DocumentRegistryFragment,
} from '@openmsupply-client/programs';
import { AppRoute } from '@openmsupply-client/config';
import { PatientTabValue } from '../../Patient/PatientView/PatientView';
import { CreateEncounterForm } from '../../Patient/Encounter';

export const ScheduleNextEncounterModal = ({
  patientId,
  encounterConfig,
  onClose,
  suggestedDate,
}: {
  patientId: string;
  encounterConfig: DocumentRegistryFragment;
  onClose: () => void;
  suggestedDate: Date | null;
}) => {
  const { user, storeId } = useAuthContext();
  const t = useTranslation();
  const [draft, setDraft] = useState<EncounterSchema>({
    createdDatetime: new Date().toISOString(),
    startDatetime: suggestedDate?.toISOString(),
    createdBy: { id: user?.id ?? '', username: user?.name ?? '' },
    status: EncounterNodeStatus.Pending,
    location: {
      storeId,
    },
  });
  const navigate = useNavigate();
  const { error } = useNotification();
  const [hasFormError, setHasFormError] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleSave = useEncounter.document.upsert(
    patientId,
    encounterConfig.documentType
  );

  const { Modal } = useDialog({
    isOpen: true,
    onClose: onClose,
  });

  const canSubmit = () =>
    draft !== undefined && draft.startDatetime && !hasFormError;

  return (
    <Modal
      title={t('label.schedule-next-encounter')}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          variant={'save'}
          disabled={!canSubmit() || isCreating}
          onClick={async () => {
            setIsCreating(true);
            const { id } = await handleSave(
              draft,
              encounterConfig.formSchemaId
            );

            if (!id) {
              setIsCreating(false);
              error(t('error.encounter-not-created'))();
              return;
            }
            navigate(
              RouteBuilder.create(AppRoute.Dispensary)
                .addPart(AppRoute.Patients)
                .addPart(patientId)
                .addQuery({ tab: PatientTabValue.Encounters })
                .build()
            );

            onClose();
          }}
        />
      }
      width={700}
    >
      <React.Suspense fallback={<div />}>
        <Stack gap={1}>
          <CreateEncounterForm
            draft={draft}
            setDraft={setDraft}
            setHasFormError={setHasFormError}
          />
        </Stack>
      </React.Suspense>
    </Modal>
  );
};
