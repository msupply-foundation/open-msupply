import {
  Autocomplete,
  BasicSpinner,
  BasicTextInput,
  Box,
  ButtonWithIcon,
  CellProps,
  Checkbox,
  ColumnDataSetter,
  Container,
  createTableStore,
  DataTable,
  DeleteIcon,
  DemographicNode,
  DialogButton,
  FnUtils,
  IconButton,
  InputWithLabelRow,
  ModalMode,
  NumberCell,
  NumberInputCell,
  MultipleNumberInputCell,
  NumericTextInput,
  PlusCircleIcon,
  TableProvider,
  TextInputCell,
  useColumns,
  useDialog,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import React, { useMemo, FC } from 'react';
import { useVaccineCourse } from '../api/hooks/useVaccineCourse';
import { useDemographicData } from '@openmsupply-client/system';
import { VaccineItemSelect } from './VaccineCourseItemSelect';
import { DraftVaccineCourse, VaccineCourseFragment } from '../api';
import { VaccineCourseDoseFragment } from '../api/operations.generated';

const getDemographicOptions = (demographics: DemographicNode[]) => {
  const options = demographics.map(demographic => {
    return {
      value: demographic.id,
      label: demographic.name,
    };
  });
  return options;
};

const Row = ({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) => (
  <Box paddingTop={1.5}>
    <InputWithLabelRow
      labelWidth="160px"
      label={label}
      labelProps={{
        sx: {
          fontSize: '16px',
          paddingRight: 2,
          textAlign: 'right',
        },
      }}
      Input={
        <Box sx={{}} flex={1}>
          {children}
        </Box>
      }
    />
  </Box>
);

interface VaccineCourseEditModalProps {
  vaccineCourse: VaccineCourseFragment | null;
  isOpen: boolean;
  onClose: () => void;
  programId: string | undefined;
  mode: ModalMode | null;
}

function doseIndex(
  doses: VaccineCourseDoseFragment[],
  dose: VaccineCourseDoseFragment
) {
  return doses.indexOf(dose) + 1;
}

export const VaccineCourseEditModal: FC<VaccineCourseEditModalProps> = ({
  vaccineCourse,
  isOpen,
  onClose,
  programId,
  mode,
}) => {
  const t = useTranslation();
  const { success, error } = useNotification();
  const {
    draft,
    update: { update },
    create: { create },
    updatePatch,
    query: { isLoading },
    isDirty,
    resetDraft,
  } = useVaccineCourse(vaccineCourse?.id ?? undefined);
  const doses = draft.vaccineCourseDoses ?? [];

  const { data: demographicData } = useDemographicData.demographics.list();

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });

  const options = useMemo(
    () => getDemographicOptions(demographicData?.nodes ?? []),
    [demographicData]
  );

  const defaultValue = {
    value: draft.demographic?.name ?? '',
    label: draft.demographic?.name ?? '',
  };
  const save = async () => {
    const agesAreInOrder = doses.every((dose, index, doses) => {
      const prevDoseAge = doses[index - 1]?.minAgeMonths ?? -0.01;
      return dose.minAgeMonths > prevDoseAge;
    });

    if (!agesAreInOrder) {
      error(t('error.dose-ages-out-of-order'))();
      return;
    }

    for (const dose of doses) {
      if (dose.minAgeMonths > dose.maxAgeMonths) {
        error(
          t('error.dose-max-lower-than-min', {
            doseIndex: doseIndex(doses, dose),
          })
        )();
        return;
      }
    }

    try {
      const result =
        mode === ModalMode.Update
          ? await update()
          : await create(programId ?? '');
      if (result?.__typename === 'VaccineCourseNode') {
        const message =
          mode === ModalMode.Update
            ? `${t('messages.updated-new-vaccine-course')}: ${result.name}`
            : `${t('messages.created-new-vaccine-course')}: ${result.name}`;
        resetDraft();
        success(message)();
        onClose();
      }
    } catch (e) {
      error(t('error.failed-to-save-vaccine-course'))();
      console.error(e);
    }
  };

  const isValid =
    draft.name.trim() &&
    !draft.vaccineCourseDoses?.some(dose => !dose.label.trim());

  const modalContent = isLoading ? (
    <BasicSpinner />
  ) : (
    <Box display="flex" flex={1}>
      <Container>
        <Row label={t('label.immunisation-name')}>
          <BasicTextInput
            value={draft?.name ?? ''}
            fullWidth
            onChange={e => updatePatch({ name: e.target.value })}
            autoFocus
            required
          />
        </Row>
        <Row label={t('label.target-demographic')}>
          <Autocomplete
            isOptionEqualToValue={option =>
              option?.value === draft.demographicId
            }
            onChange={(_e, selected) =>
              updatePatch({ demographicId: selected?.value })
            }
            defaultValue={defaultValue}
            options={options}
          />
        </Row>
        <Row label={t('label.coverage-rate')}>
          <NumericTextInput
            value={draft?.coverageRate ?? 1}
            fullWidth
            onChange={value => updatePatch({ coverageRate: value })}
            endAdornment="%"
            decimalLimit={1}
          />
        </Row>
        <Row label={t('label.wastage-rate')}>
          <NumericTextInput
            value={draft?.wastageRate ?? 1}
            fullWidth
            onChange={value => updatePatch({ wastageRate: value })}
            endAdornment="%"
            decimalLimit={1}
          />
        </Row>
        <Row label={t('label.vaccine-items')}>
          <VaccineItemSelect draft={draft} onChange={updatePatch} />
        </Row>
        <Row label={t('label.calculate-demand')}>
          <Checkbox
            checked={draft?.useInGapsCalculations ?? true}
            onChange={e =>
              updatePatch({ useInGapsCalculations: e.target.checked })
            }
          ></Checkbox>
        </Row>
        <VaccineCourseDoseTable
          courseName={draft.name}
          doses={doses}
          updatePatch={updatePatch}
        />
      </Container>
    </Box>
  );

  return (
    <Modal
      title={
        mode === ModalMode.Create
          ? t('heading.create-vaccine-course')
          : t('heading.edit-vaccine-course')
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      okButton={
        <DialogButton
          disabled={!isDirty || !programId || !isValid}
          variant="ok"
          onClick={save}
        />
      }
      height={900}
      width={1100}
      slideAnimation={false}
    >
      {modalContent}
    </Modal>
  );
};

const VaccineCourseDoseTable = ({
  doses,
  updatePatch,
  courseName,
}: {
  courseName: string;
  doses: VaccineCourseDoseFragment[];
  updatePatch: (newData: Partial<DraftVaccineCourse>) => void;
}) => {
  const t = useTranslation();

  const addDose = () => {
    const previousDose = doses[doses.length - 1];
    const previousMin = previousDose?.minAgeMonths ?? 0;
    const previousMax = previousDose?.maxAgeMonths ?? 0;
    const previousRange = previousMax - previousMin;

    updatePatch({
      vaccineCourseDoses: [
        ...doses,
        {
          __typename: 'VaccineCourseDoseNode',
          id: FnUtils.generateUUID(),
          label: `${courseName} ${doses.length + 1}`,
          minAgeMonths: previousMax,
          maxAgeMonths: previousMax + (previousRange || 1),
          minIntervalDays: previousDose?.minIntervalDays ?? 30,
          customAgeLabel: '',
        },
      ],
    });
  };

  const deleteDose = (id: string) => {
    updatePatch({
      vaccineCourseDoses: doses.filter(dose => dose.id !== id),
    });
  };

  const updateDose: ColumnDataSetter<VaccineCourseDoseFragment> = newData => {
    updatePatch({
      vaccineCourseDoses: doses.map(dose =>
        dose.id === newData.id ? { ...dose, ...newData } : dose
      ),
    });
  };

  const columns = useColumns<VaccineCourseDoseFragment>(
    [
      {
        key: 'doseNumber',
        Cell: NumberCell,
        width: 80,
        label: 'label.dose-number',
        accessor: ({ rowData }) => doseIndex(doses, rowData),
      },
      {
        key: 'label',
        Cell: LabelCell,
        cellProps: { isRequired: true },
        width: 280,
        label: 'label.label',
        setter: updateDose,
      },
      {
        key: 'minAgeMonths',
        Cell: AgeCell,
        label: 'label.from-age',
        setter: updateDose,
      },
      {
        key: 'maxAgeMonths',
        Cell: AgeCell,
        label: 'label.to-age',
        setter: updateDose,
      },
      {
        key: 'customAgeLabel',
        Cell: LabelCell,
        label: 'label.custom-age-label',
        accessor: ({ rowData }) => rowData.customAgeLabel ?? '',
        cellProps: { debounceTime: 0 },
        setter: updateDose,
      },
      {
        key: 'minIntervalDays',
        Cell: NumberInputCell,
        width: 120,
        label: 'label.min-interval',
        setter: updateDose,
      },
      {
        key: 'delete',
        Cell: ({ rowData }) => (
          <IconButton
            icon={<DeleteIcon sx={{ height: '0.9em' }} />}
            label={t('label.delete')}
            onClick={() => deleteDose(rowData.id)}
          />
        ),
      },
    ],
    {},
    [updateDose, doses]
  );

  return (
    <>
      <Box display="flex" justifyContent="flex-end" marginBottom="8px">
        <ButtonWithIcon
          Icon={<PlusCircleIcon />}
          label={t('label.dose')}
          onClick={addDose}
        />
      </Box>
      <TableProvider createStore={createTableStore}>
        <DataTable
          id={'doses-list'}
          columns={columns}
          data={doses}
          noDataMessage={t('message.add-a-dose')}
          dense
        />
      </TableProvider>
    </>
  );
};

// Input cells can't be defined inline, otherwise they lose focus on re-render
const LabelCell = (props: CellProps<VaccineCourseDoseFragment>) => (
  <TextInputCell fullWidth {...props} />
);

const AgeCell = (props: CellProps<VaccineCourseDoseFragment>) => {
  const t = useTranslation();
  return (
    <MultipleNumberInputCell
      decimalLimit={2}
      width={60}
      {...props}
      units={[
        {
          key: 'year',
          ratio: 12,
          label: t('label.years-abbreviation'),
          max: 150,
        },
        {
          key: 'month',
          ratio: 1,
          label: t('label.months-abbreviation'),
          max: 11,
        },
      ]}
    />
  );
};
