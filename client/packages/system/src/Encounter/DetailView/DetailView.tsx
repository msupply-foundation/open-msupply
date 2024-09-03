import React, { FC, useEffect, useState } from 'react';
import {
  useTranslation,
  DetailViewSkeleton,
  AlertModal,
  useNavigate,
  RouteBuilder,
  useDebounceCallback,
  useBreadcrumbs,
  useFormatDateTime,
  Breadcrumb,
  useIntlUtils,
  EncounterNodeStatus,
  useDialog,
  DialogButton,
  ButtonWithIcon,
  SaveIcon,
} from '@openmsupply-client/common';
import {
  useEncounter,
  useJsonForms,
  EncounterFragment,
  useDocumentDataAccessor,
  EncounterSchema,
  JsonData,
} from '@openmsupply-client/programs';
import { AppRoute } from '@openmsupply-client/config';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { SidePanel } from './SidePanel';
import { AppBarButtons } from './AppBarButtons';
import { getLogicalStatus } from '../utils';
import { PatientTabValue } from '../../Patient/PatientView/PatientView';

const getPatientBreadcrumbSuffix = (
  encounter: EncounterFragment,
  getLocalisedFullName: (
    firstName: string | null | undefined,
    lastName: string | null | undefined
  ) => string
): string => {
  if (!!encounter.patient.firstName || !!encounter.patient.firstName) {
    return getLocalisedFullName(
      encounter.patient.firstName,
      encounter.patient.lastName
    );
  }
  if (!!encounter.patient.code2) return encounter.patient.code2;
  if (!!encounter.patient.code) return encounter.patient.code;
  return encounter.patient.id;
};

/**
+ * Updates the status and once the status has been updated saves the encounter
+ */
const useSaveWithStatus = (
  saveData: () => void,
  encounterData: EncounterSchema | undefined,
  updateEncounter: (patch: Partial<EncounterFragment>) => Promise<void>
): ((status: EncounterNodeStatus | undefined) => void) => {
  const [saveStatus, setSaveStatus] = useState<
    EncounterNodeStatus | undefined
  >();

  useEffect(() => {
    if (!!saveStatus && saveStatus === encounterData?.status) {
      saveData();
    }
  }, [saveStatus, encounterData?.status]);

  return (status: EncounterNodeStatus | undefined) => {
    if (status === undefined) {
      // no status change
      saveData();
      return;
    }
    updateEncounter({ status });
    setSaveStatus(status);
  };
};

const useSaveWithStatusChangeModal = (
  onSave: () => void,
  encounterData: EncounterSchema | undefined,
  updateEncounter: (patch: Partial<EncounterFragment>) => Promise<void>
): { showDialog: () => void; SaveAsVisitedModal: React.FC } => {
  const { Modal, hideDialog, showDialog } = useDialog({
    disableBackdrop: true,
  });
  const t = useTranslation('dispensary');

  const saveWithStatusChange = useSaveWithStatus(
    onSave,
    encounterData,
    updateEncounter
  );

  const SaveAsVisitedModal = () => (
    <Modal
      title={t('messages.save-encounter-as-visited')}
      cancelButton={<DialogButton variant="cancel" onClick={hideDialog} />}
      height={200}
      okButton={
        <DialogButton
          variant="save"
          onClick={() => {
            onSave();
            hideDialog();
          }}
        />
      }
      nextButton={
        <ButtonWithIcon
          color="secondary"
          variant="contained"
          onClick={() => {
            saveWithStatusChange(EncounterNodeStatus.Visited);
            hideDialog();
          }}
          Icon={<SaveIcon />}
          label={t('button-save-as-visited')}
        />
      }
    >
      <></>
    </Modal>
  );

  return {
    showDialog,
    SaveAsVisitedModal,
  };
};

export const DetailView: FC = () => {
  const t = useTranslation('dispensary');
  const id = useEncounter.utils.idFromUrl();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const dateFormat = useFormatDateTime();
  const { getLocalisedFullName } = useIntlUtils();
  const [logicalStatus, setLogicalStatus] = useState<string | undefined>(
    undefined
  );
  const [deleteRequest, setDeleteRequest] = useState(false);

  const {
    data: encounter,
    isSuccess,
    isError,
  } = useEncounter.document.byId(id);

  const handleSave = useEncounter.document.upsertDocument(
    encounter?.patient.id ?? '',
    encounter?.type ?? ''
  );

  const dataAccessor = useDocumentDataAccessor(
    encounter?.document?.name,
    undefined,
    handleSave
  );
  const {
    JsonForm,
    data,
    setData,
    saveData,
    isDirty,
    isSaving,
    validationError,
    revert,
  } = useJsonForms(
    {
      documentName: encounter?.document?.name,
      patientId: encounter?.patient?.id,
    },
    dataAccessor
  );

  const updateEncounter = useDebounceCallback(
    (patch: Partial<EncounterFragment>) =>
      setData({
        ...(typeof data === 'object' ? data : {}),
        ...patch,
      }),
    [data, setData]
  );

  const onDelete = () => {
    updateEncounter({ status: EncounterNodeStatus.Deleted });
    setDeleteRequest(true);
  };
  useEffect(() => {
    if (!deleteRequest) return;
    if (
      (data as Record<string, JsonData>)['status'] ===
      EncounterNodeStatus.Deleted
    ) {
      (async () => {
        const result = await saveData(true);
        if (!result) return;

        // allow the is dirty flag to settle
        await new Promise(resolve => setTimeout(resolve, 100));
        navigate(-1);
      })();
    }
  }, [deleteRequest, data]);

  const { showDialog: showSaveAsVisitedDialog, SaveAsVisitedModal } =
    useSaveWithStatusChangeModal(
      saveData,
      data as unknown as EncounterSchema,
      updateEncounter
    );
  const dataStatus = data
    ? (data as Record<string, JsonData>)['status']
    : undefined;
  const suggestSaveWithStatusVisited = encounter
    ? new Date(encounter.startDatetime).getTime() < Date.now() &&
      encounter.status === EncounterNodeStatus.Pending &&
      dataStatus === EncounterNodeStatus.Pending
    : false;

  useEffect(() => {
    if (encounter) {
      setCustomBreadcrumbs({
        1: (
          <>
            <Breadcrumb
              to={RouteBuilder.create(AppRoute.Dispensary)
                .addPart(AppRoute.Patients)
                .addPart(encounter.patient.id)
                .addQuery({
                  tab: PatientTabValue.Encounters,
                })
                .build()}
            >
              {getPatientBreadcrumbSuffix(encounter, getLocalisedFullName)}
            </Breadcrumb>
            <span>{` / ${
              encounter.document.documentRegistry?.name
            } - ${dateFormat.localisedDate(encounter.startDatetime)}`}</span>
          </>
        ),
      });

      if (encounter.status === EncounterNodeStatus.Pending) {
        const datetime = new Date(encounter.startDatetime);
        const status = getLogicalStatus(datetime, t);
        setLogicalStatus(status);
      }
    }
  }, [encounter]);

  if (!isSuccess && !isError) return <DetailViewSkeleton />;

  return (
    <React.Suspense fallback={<DetailViewSkeleton />}>
      <link rel="stylesheet" href="/medical-icons.css" media="all"></link>
      <AppBarButtons logicalStatus={logicalStatus} />
      {encounter && (
        <Toolbar
          onChange={updateEncounter}
          encounter={encounter}
          onDelete={onDelete}
        />
      )}
      {encounter ? (
        JsonForm
      ) : (
        <AlertModal
          open={true}
          onOk={() =>
            navigate(
              RouteBuilder.create(AppRoute.Dispensary)
                .addPart(AppRoute.Encounter)
                .build()
            )
          }
          title={t('error.encounter-not-found')}
          message={t('messages.click-to-return-to-encounters')}
        />
      )}
      {encounter && (
        <SidePanel encounter={encounter} onChange={updateEncounter} />
      )}
      <SaveAsVisitedModal />
      <Footer
        documentName={encounter?.document?.name}
        onSave={() => {
          if (suggestSaveWithStatusVisited) {
            showSaveAsVisitedDialog();
          } else {
            saveData();
          }
        }}
        onCancel={revert}
        isSaving={isSaving}
        isDisabled={!isDirty || !!validationError}
        encounter={data as EncounterFragment}
      />
    </React.Suspense>
  );
};
