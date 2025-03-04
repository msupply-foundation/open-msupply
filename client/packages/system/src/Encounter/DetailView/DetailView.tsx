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
  DetailTabs,
  useConfirmOnLeaving,
  useConfirmationModal,
  useEditModal,
  isEmpty,
} from '@openmsupply-client/common';
import {
  useEncounter,
  useJsonFormsHandler,
  EncounterFragment,
  useDocumentDataAccessor,
  EncounterSchema,
  JsonData,
  unrankedToolbarTester,
} from '@openmsupply-client/programs';
import { AppRoute } from '@openmsupply-client/config';
import { Toolbar } from './Toolbar';
import { Footer } from './Footer';
import { SidePanel } from './SidePanel';
import { AppBarButtons } from './AppBarButtons';
import { getLogicalStatus } from '../utils';
import { PatientTabValue } from '../../Patient/PatientView/PatientView';
import { VaccinationCard } from '../../Vaccination/Components/VaccinationCard';
import { ScheduleNextEncounterModal } from './ScheduleNextEncounterModal';
import { usePatientVaccineCard } from '../../Vaccination/api/usePatientVaccineCard';
import { getNextVaccinationEncounterDate } from './helpers';
import { useSaveWithStatusChange } from './useSaveWithStatusChange';

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

export const DetailView: FC = () => {
  const t = useTranslation();
  const id = useEncounter.utils.idFromUrl();
  const navigate = useNavigate();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const dateFormat = useFormatDateTime();
  const { getLocalisedFullName } = useIntlUtils();
  const [logicalStatus, setLogicalStatus] = useState<string | undefined>(
    undefined
  );
  const [deleteRequest, setDeleteRequest] = useState(false);
  const nextEncounterModal = useEditModal<{ onCancel?: () => void }>();

  const {
    data: encounter,
    isSuccess,
    isError,
  } = useEncounter.document.byId(id);

  // If this is a vaccination encounter, we want to use the suggested
  // next vaccination dates for the next encounter
  const {
    query: { data: vaccineCard },
  } = usePatientVaccineCard(encounter?.programEnrolment?.id ?? '');
  const suggestedNextEncounterDate = getNextVaccinationEncounterDate(
    vaccineCard?.items ?? []
  );

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
  } = useJsonFormsHandler(
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
      setDeleteRequest(false);
      (async () => {
        const result = await saveData(true);
        if (!result) return;

        // allow the is dirty flag to settle
        await new Promise(resolve => setTimeout(resolve, 100));
        navigate(-1);
      })();
    }
  }, [deleteRequest, data]);

  const {
    showDialog: showSaveAsVisitedDialog,
    SaveAsVisitedModal,
    saveWithStatusChange,
  } = useSaveWithStatusChange(
    saveData,
    data as unknown as EncounterSchema,
    updateEncounter
  );

  const promptToMarkVisitedOnLeaving = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.mark-as-visited'),
    cancelButtonLabel: t('label.leave-as-pending'),
    buttonLabel: t('label.mark-as-visited'),
    onConfirm: ({ onCancel }) => {
      saveWithStatusChange(EncounterNodeStatus.Visited, () =>
        nextEncounterModal.onOpen({ onCancel })
      );
    },
  });

  // Block navigation if the encounter is dirty and the status is pending
  // "cancel" maps to "leave as pending" => would proceed with the navigation
  // confirm to mark as visited
  const { isDirty: shouldMarkVisited, setIsDirty: setShouldMarkVisited } =
    useConfirmOnLeaving('encounter', {
      allowRefresh: true,
      customConfirmation: proceed =>
        promptToMarkVisitedOnLeaving({
          onCancel: proceed,
        }),
    });

  const dataStatus = data
    ? (data as Record<string, JsonData>)['status']
    : undefined;

  useEffect(() => {
    // If JSON form is touched, we should prompt to mark as visited on leaving
    if (
      isDirty &&
      dataStatus === EncounterNodeStatus.Pending &&
      !shouldMarkVisited
    ) {
      setShouldMarkVisited(true);
    }

    // Allow to navigate away without prompt if the encounter is already visited
    if (shouldMarkVisited && dataStatus === EncounterNodeStatus.Visited) {
      setShouldMarkVisited(false);
    }
  }, [dataStatus, isDirty]);

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
      } else {
        setLogicalStatus(undefined);
      }
    }
  }, [encounter]);

  if (!isSuccess && !isError) return <DetailViewSkeleton />;

  const suggestSaveWithStatusVisited = encounter
    ? new Date(encounter.startDatetime).getTime() < Date.now() &&
      encounter.status === EncounterNodeStatus.Pending &&
      dataStatus === EncounterNodeStatus.Pending
    : false;

  const VaxCard = encounter?.programEnrolment?.isImmunisationProgram ? (
    <VaccinationCard
      encounterId={encounter.id}
      programEnrolmentId={encounter.programEnrolment.id}
      clinician={encounter.clinician ?? undefined}
      onOk={() => {
        // After changes to vax card, if the encounter is still pending
        // we should prompt to mark as visited on leaving
        if (encounter.status === EncounterNodeStatus.Pending)
          setShouldMarkVisited(true);
      }}
    />
  ) : null;

  // Some Immunisation Program Encounters require minimal extra data
  // and may choose to display these inputs in the toolbar rather than the full form tab
  const { uiSchema, jsonSchema } = JsonForm.props;
  const jsonSchemaLoaded = !isEmpty(jsonSchema);
  const usingToolbarFormLayout = unrankedToolbarTester(uiSchema, jsonSchema, {
    rootSchema: jsonSchema,
    config: {},
  });

  // If we need to show both vax card and forms page, we need to use tabs
  const asTabs = jsonSchemaLoaded && !!VaxCard && !usingToolbarFormLayout;

  return (
    <React.Suspense fallback={<DetailViewSkeleton />}>
      <AppBarButtons logicalStatus={logicalStatus} />
      {!encounter ? (
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
      ) : (
        <>
          {nextEncounterModal.isOpen && encounter.document.documentRegistry && (
            <ScheduleNextEncounterModal
              encounterConfig={encounter.document.documentRegistry}
              onClose={nextEncounterModal.onClose}
              patientId={encounter.patient.id ?? ''}
              suggestedDate={suggestedNextEncounterDate}
              onCancel={nextEncounterModal.entity?.onCancel}
            />
          )}
          <Toolbar onChange={updateEncounter} encounter={encounter} />
          {asTabs ? (
            <DetailTabs
              tabs={[
                { Component: VaxCard, value: t('label.vaccinations') },
                { Component: JsonForm, value: t('label.details') },
              ]}
            />
          ) : (
            <>
              {VaxCard}
              {jsonSchemaLoaded && JsonForm}
            </>
          )}

          <SidePanel
            encounter={encounter}
            onChange={updateEncounter}
            onDelete={onDelete}
          />
        </>
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
        onChangeStatus={status =>
          saveWithStatusChange(status, () => nextEncounterModal.onOpen())
        }
        onCancel={revert}
        isSaving={isSaving}
        isDisabled={!isDirty || !!validationError}
        encounter={data as EncounterFragment}
      />
    </React.Suspense>
  );
};
