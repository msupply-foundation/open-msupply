import {
  Autocomplete,
  BasicSpinner,
  BasicTextInput,
  Box,
  Checkbox,
  Container,
  DeleteIcon,
  DemographicIndicatorNode,
  DialogButton,
  FlatButton,
  FnUtils,
  IconButton,
  InputWithLabelRow,
  ModalMode,
  NumericTextInput,
  PlusCircleIcon,
  Table,
  useDialog,
  useKeyboardHeightAdjustment,
  useNotification,
  useTranslation,
  VaccineCourseScheduleNode,
} from '@openmsupply-client/common';
import React, { useMemo, FC } from 'react';
import { useVaccineCourse } from '../api/hooks/useVaccineCourse';
import { useDemographicData } from '@openmsupply-client/system';
import { VaccineItemSelect } from './VaccineCourseItemSelect';
import { DraftVaccineCourse, VaccineCourseFragment } from '../api';
import { VaccineCourseScheduleFragment } from '../api/operations.generated';

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
  const height = useKeyboardHeightAdjustment(600);

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
          doses={draft.vaccineCourseSchedules ?? []}
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
      width={700}
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
  doses: VaccineCourseScheduleFragment[];
  updatePatch: (newData: Partial<DraftVaccineCourse>) => void;
}) => {
  const t = useTranslation('programs');

  const addDose = () => {
    updatePatch({
      vaccineCourseSchedules: [
        ...doses,
        {
          __typename: 'VaccineCourseScheduleNode',
          id: FnUtils.generateUUID(),
          // temp - will be overwritten by the backend to assign unique dose number (even if previous doses were deleted)
          doseNumber: doses.length + 1,
          label: `${courseName} ${doses.length + 1}`,
          minAgeMonths: 0,
          minIntervalDays: 0,
        },
      ],
    });
  };

  const deleteDose = (id: string) => {
    updatePatch({
      vaccineCourseSchedules: doses.filter(dose => dose.id !== id),
    });
  };

  const updateDose = (
    id: string,
    newData: Partial<VaccineCourseScheduleNode>
  ) => {
    updatePatch({
      vaccineCourseSchedules: doses.map(dose =>
        dose.id === id ? { ...dose, ...newData } : dose
      ),
    });
  };

  return (
    <Table sx={{ marginTop: '16px', '& td': { padding: '3px' } }}>
      <tr style={{ borderBottom: '1px solid lightgray' }}>
        <HeaderCell label="Dose #" width="80px" />
        <HeaderCell label={t('label.label')} width="250px" />
        <HeaderCell label="Age (months)" />
        <HeaderCell label="Min interval (days)" />
        <th>
          <FlatButton
            startIcon={<PlusCircleIcon />}
            label={t('label.dose')}
            onClick={addDose}
          />
        </th>
      </tr>
      <tbody>
        {doses.map((dose, index) => (
          <tr>
            <td style={{ textAlign: 'center' }}>{index + 1}</td>
            <td>
              <BasicTextInput
                value={dose.label}
                fullWidth
                onChange={e => updateDose(dose.id, { label: e.target.value })}
              />
            </td>
            <td>
              <NumericTextInput value={dose.minAgeMonths} fullWidth />
            </td>
            <td>
              <NumericTextInput value={dose.minIntervalDays} fullWidth />
            </td>
            <td style={{ display: 'flex', justifyContent: 'center' }}>
              <IconButton
                icon={<DeleteIcon />}
                label={t('label.delete')}
                onClick={() => deleteDose(dose.id)}
              />
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
};

const HeaderCell = ({ label, width }: { label: string; width?: string }) => {
  return <th style={{ fontSize: '14px', width, padding: '3px' }}>{label}</th>;
};
