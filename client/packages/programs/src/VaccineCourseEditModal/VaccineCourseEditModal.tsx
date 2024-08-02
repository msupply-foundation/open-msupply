import {
  Autocomplete,
  BasicSpinner,
  BasicTextInput,
  Box,
  Checkbox,
  Container,
  DemographicIndicatorNode,
  DialogButton,
  InputWithLabelRow,
  ModalMode,
  NumericTextInput,
  useDialog,
  useKeyboardHeightAdjustment,
  useNotification,
  useTranslation,
} from '@openmsupply-client/common';
import React, { useMemo, FC } from 'react';
import { useVaccineCourse } from '../api/hooks/useVaccineCourse';
import { useDemographicData } from '@openmsupply-client/system';
import { VaccineItemSelect } from './VaccineCourseItemSelect';
import { VaccineCourseFragment } from '../api';

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

  const tryUpdateValue = (value: number | undefined) => {
    if (value === undefined) {
      return;
    }
    updatePatch({ doses: value });
  };

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

        <Row label={t('label.number-of-doses')}>
          <NumericTextInput
            value={draft.doses}
            fullWidth
            onChange={tryUpdateValue}
          />
        </Row>
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
