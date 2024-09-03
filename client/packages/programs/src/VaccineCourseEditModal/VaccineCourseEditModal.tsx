import {
  Autocomplete,
  BasicSpinner,
  BasicTextInput,
  Box,
  ButtonWithIcon,
  Checkbox,
  ColumnDataSetter,
  Container,
  createTableStore,
  DataTable,
  DeleteIcon,
  DemographicIndicatorNode,
  DialogButton,
  FnUtils,
  IconButton,
  InputWithLabelRow,
  ModalMode,
  NumberCell,
  NumberInputCell,
  NumericTextInput,
  PlusCircleIcon,
  TableProvider,
  TextInputCell,
  useColumns,
  useDialog,
  useKeyboardHeightAdjustment,
  useNotification,
  useTranslation,
  VaccineCourseDoseNode,
} from '@openmsupply-client/common';
import React, { useMemo, FC } from 'react';
import { useVaccineCourse } from '../api/hooks/useVaccineCourse';
import { useDemographicData } from '@openmsupply-client/system';
import { VaccineItemSelect } from './VaccineCourseItemSelect';
import { DraftVaccineCourse, VaccineCourseFragment } from '../api';
import { VaccineCourseDoseFragment } from '../api/operations.generated';

const getDemographicOptions = (
  demographicIndicators: DemographicIndicatorNode[]
) => {
  const options = demographicIndicators.map(indicator => {
    return {
      value: indicator.id,
      label: `${indicator.name} ${indicator.baseYear}`,
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

export const VaccineCourseEditModal: FC<VaccineCourseEditModalProps> = ({
  vaccineCourse,
  isOpen,
  onClose,
  programId,
  mode,
}) => {
  const t = useTranslation('coldchain');
  const { success, error } = useNotification();
  const {
    draft,
    update: { update },
    create: { create },
    updatePatch,
    query: { isLoading },
    isDirty,
    setIsDirty,
  } = useVaccineCourse(vaccineCourse?.id ?? undefined);
  const { data: demographicData } = useDemographicData.indicator.list();

  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const height = useKeyboardHeightAdjustment(900);

  const options = useMemo(
    () => getDemographicOptions(demographicData?.nodes ?? []),
    [demographicData]
  );

  const defaultValue = {
    value: draft.demographicIndicator?.name ?? '',
    label: draft.demographicIndicator
      ? `${draft.demographicIndicator?.name} ${draft.demographicIndicator?.baseYear}`
      : '',
  };

  const save = async () => {
    setIsDirty(false);
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
        success(message)();
        onClose();
      }
    } catch (e) {
      error(t('error.failed-to-save-vaccine-course'))();
      console.error(e);
    }
  };

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
          />
        </Row>
        <Row label={t('label.target-demographic')}>
          <Autocomplete
            isOptionEqualToValue={option =>
              option?.value === draft.demographicIndicatorId
            }
            onChange={(_e, selected) =>
              updatePatch({ demographicIndicatorId: selected?.value })
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
            checked={draft?.isActive ?? true}
            onChange={e => updatePatch({ isActive: e.target.checked })}
          ></Checkbox>
        </Row>
        <VaccineCourseDoseTable
          courseName={draft.name}
          doses={draft.vaccineCourseDoses ?? []}
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
          disabled={!isDirty || !programId}
          variant="ok"
          onClick={save}
        />
      }
      height={height}
      width={750}
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
  const t = useTranslation('programs');

  const addDose = () => {
    updatePatch({
      vaccineCourseDoses: [
        ...doses,
        {
          __typename: 'VaccineCourseDoseNode',
          id: FnUtils.generateUUID(),
          // temp - will be overwritten by the backend to assign unique dose number (even if previous doses were deleted)
          label: `${courseName} ${doses.length + 1}`,
          minAgeMonths: 0,
          minIntervalDays: 0,
        },
      ],
    });
  };

  const deleteDose = (id: string) => {
    updatePatch({
      vaccineCourseDoses: doses.filter(dose => dose.id !== id),
    });
  };

  const updateDose: ColumnDataSetter<VaccineCourseDoseNode> = newData => {
    updatePatch({
      vaccineCourseDoses: doses.map(dose =>
        dose.id === newData.id ? { ...dose, ...newData } : dose
      ),
    });
  };

  const columns = useColumns<VaccineCourseDoseNode>(
    [
      {
        key: 'doseNumber',
        Cell: NumberCell,
        width: 80,
        label: 'label.dose-number',
        accessor: ({ rowData }) => doses.indexOf(rowData) + 1,
      },
      {
        key: 'label',
        Cell: props => <TextInputCell fullWidth {...props} />,
        width: 280,
        label: 'label.label',
        setter: updateDose,
      },
      {
        key: 'minAgeMonths',
        Cell: NumberInputCell,
        label: 'label.age-months',
        setter: updateDose,
      },
      {
        key: 'minIntervalDays',
        Cell: NumberInputCell,
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
