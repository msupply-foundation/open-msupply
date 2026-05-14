import {
  Autocomplete,
  BasicSpinner,
  BasicTextInput,
  Box,
  ButtonWithIcon,
  Checkbox,
  ColumnDef,
  ColumnDataSetter,
  ColumnType,
  Container,
  DeleteIcon,
  DemographicNode,
  DialogButton,
  ErrorDisplay,
  ErrorDisplayItem,
  FieldErrorWrapper,
  FnUtils,
  useFormField,
  IconButton,
  InputWithLabelRow,
  MaterialTable,
  ModalMode,
  NumericTextInput,
  PlusCircleIcon,
  useDialog,
  useForm,
  useFormErrorList,
  useNotification,
  useSimpleMaterialTable,
  useTranslation,
  AgeInputCell,
  NumberInputCell,
  TextInputCell,
} from '@openmsupply-client/common';
import React, { useMemo, FC } from 'react';
import { useVaccineCourse } from '../api/hooks/useVaccineCourse';
import { useDemographicData } from '@openmsupply-client/system';
import { VaccineItemSelect } from './VaccineCourseItemSelect';
import { StoreWastagePanel } from './StorageConfigPanel';
import { DraftVaccineCourse } from '../api';
import { VaccineCourseDoseFragment } from '../api/operations.generated';

const FORM_ID = 'vaccine-course-edit';

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
  vaccineCourseId: string | null;
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

function doseIndexById(doses: VaccineCourseDoseFragment[], doseId: string) {
  return doses.findIndex(d => d.id === doseId) + 1;
}

export const VaccineCourseEditModal: FC<VaccineCourseEditModalProps> = ({
  vaccineCourseId,
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
    resetDraft,
  } = useVaccineCourse(vaccineCourseId ?? undefined);
  const { Modal } = useDialog({ isOpen, onClose, disableBackdrop: true });
  const doses = draft.vaccineCourseDoses ?? [];

  const form = useForm(FORM_ID);
  const flatErrors = useFormErrorList(FORM_ID);

  // Combined summary: top-form errors pass through 1:1; dose-cell errors
  // (fieldId `${doseId}.${column}`) are grouped per row into one consolidated
  // line. The `.` in fieldId is what tells this combiner to group.
  const summaryItems = useMemo<ErrorDisplayItem[]>(() => {
    const topForm: ErrorDisplayItem[] = [];
    const doseGroups = new Map<string, string[]>();

    for (const err of flatErrors) {
      if (!err.fieldId.includes('.')) {
        topForm.push({
          key: err.fieldId,
          label: err.label,
          message: err.message,
        });
      } else {
        const [doseId] = err.fieldId.split('.');
        if (!doseId) continue;
        const list = doseGroups.get(doseId) ?? [];
        list.push(err.message);
        doseGroups.set(doseId, list);
      }
    }

    const doseItems: ErrorDisplayItem[] = [...doseGroups].map(
      ([doseId, messages]) => ({
        key: doseId,
        label: `${t('label.dose')} ${doseIndexById(doses, doseId)}`,
        message: messages.join(', '),
      })
    );

    return [...topForm, ...doseItems];
  }, [flatErrors, doses, t]);

  const { data: demographicData } = useDemographicData.demographics.list();

  const options = useMemo(
    () => getDemographicOptions(demographicData?.nodes ?? []),
    [demographicData]
  );

  const defaultValue = {
    value: draft.demographic?.name ?? '',
    label: draft.demographic?.name ?? '',
  };

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
          label: `${draft.name} ${doses.length + 1}`,
          minAgeMonths: previousMax,
          maxAgeMonths: previousMax + (previousRange || 1),
          minIntervalDays: previousDose?.minIntervalDays ?? 30,
          customAgeLabel: '',
        },
      ],
    });
  };

  const save = async () => {
    form.showRequired();
    if (form.hasErrors()) return;

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
      error(String(e))();
      resetDraft();
      console.error(e);
    }
  };

  // Save is enabled by default — validation is now surfaced through
  // `<ErrorDisplay>` and gated by `form.hasErrors()` in the save handler. The
  // only reason to keep Save disabled outside of validation is when there's
  // no program context to save against (programmer error, shouldn't happen in
  // practice). `isDirty` no longer gates the button: in Create mode, the user
  // needs to be able to click Save on a fresh form to see the required-field
  // errors; in Edit mode, re-saving an unchanged record is harmless.
  const disable = !programId;

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
            formError={{
              formId: FORM_ID,
              fieldId: 'name',
              label: t('label.immunisation-name'),
            }}
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
        <Box display="flex" alignItems="center" gap={2}>
          <Box flex={1}>
            <Row label={t('label.coverage-rate')}>
              <NumericTextInput
                value={draft?.coverageRate}
                fullWidth
                onChange={value => updatePatch({ coverageRate: value })}
                endAdornment="%"
                decimalLimit={1}
                min={0}
                max={100}
                required
                formError={{
                  formId: FORM_ID,
                  fieldId: 'coverageRate',
                  label: t('label.coverage-rate'),
                }}
              />
            </Row>
          </Box>
          <Box flex={1}>
            <Row label={t('label.wastage-rate')}>
              <NumericTextInput
                value={draft?.wastageRate}
                fullWidth
                onChange={value => updatePatch({ wastageRate: value })}
                endAdornment="%"
                decimalLimit={1}
                min={0}
                max={100}
                required
                formError={{
                  formId: FORM_ID,
                  fieldId: 'wastageRate',
                  label: t('label.wastage-rate'),
                }}
              />
            </Row>
          </Box>
          {/* `Row` adds `paddingTop={1.5}` internally; match it on the
              button wrapper so the button visually aligns with the inputs.
              The extra `marginLeft` compensates for the empty whitespace
              that the next-row's right-aligned label naturally creates
              between the inputs — the button has no such buffer to its
              left and would otherwise sit too close to the Wastage input. */}
          <Box paddingTop={1.5} marginLeft={3}>
            <StoreWastagePanel
              storeConfigs={draft.storeConfigs ?? []}
              updatePatch={updatePatch}
            />
          </Box>
        </Box>
        <Row label={t('label.vaccine-items')}>
          <FieldErrorWrapper
            formId={FORM_ID}
            fieldId="vaccineItems"
            label={t('label.vaccine-items')}
            required
            // Coerce empty array → undefined so the required-error
            // logic (which treats undefined/null/'' as missing) fires.
            value={draft.vaccineCourseItems?.length || undefined}
            customError={
              (draft.vaccineCourseItems?.length ?? 0) === 0
                ? {
                    message: t('messages.at-least-one-vaccine-item-required'),
                    showOnSubmit: true,
                  }
                : null
            }
          >
            {({ error, required }) => (
              <VaccineItemSelect
                draft={draft}
                onChange={updatePatch}
                error={error}
                required={required}
              />
            )}
          </FieldErrorWrapper>
        </Row>
        <Box display="flex" alignItems="center" sx={{ marginBottom: '1em' }}>
          <Row label={t('label.calculate-demand')}>
            <Checkbox
              checked={draft?.useInGapsCalculations ?? true}
              onChange={e =>
                updatePatch({ useInGapsCalculations: e.target.checked })
              }
            />
          </Row>
          <Row label={t('label.can-skip-dose')}>
            <Checkbox
              checked={draft?.canSkipDose ?? false}
              onChange={e => updatePatch({ canSkipDose: e.target.checked })}
            />
          </Row>
          <Box flex={1} display="flex" justifyContent="flex-end" paddingTop={1.5}>
            <ButtonWithIcon
              Icon={<PlusCircleIcon />}
              label={t('label.dose')}
              onClick={addDose}
            />
          </Box>
        </Box>
        {/* ErrorDisplay sits above the dose table because the table has a
            minimum height that pushes content below it too far down. The
            summary stays close to the rest of the form regardless of how
            many doses are in the table. */}
        <ErrorDisplay
          items={summaryItems}
          sx={{ marginBottom: '1em' }}
        />
        <VaccineCourseDoseTable doses={doses} updatePatch={updatePatch} />
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
      okButton={<DialogButton disabled={disable} variant="ok" onClick={save} />}
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
}: {
  doses: VaccineCourseDoseFragment[];
  updatePatch: (newData: Partial<DraftVaccineCourse>) => void;
}) => {
  const t = useTranslation();

  // Synthetic form-error field for "at least one dose is required". The
  // table's rows are dynamic, so this rule has no specific cell to attach
  // to — register a virtual field at the table level whose customError
  // fires when the doses array is empty. `showOnSubmit: true` mirrors
  // required-error gating: only visible after the user attempts Save.
  useFormField({
    formId: FORM_ID,
    fieldId: 'doses',
    label: t('label.doses'),
    value: doses.length,
    customError:
      doses.length === 0
        ? {
            message: t('messages.at-least-one-dose-required'),
            showOnSubmit: true,
          }
        : null,
  });

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

  // Cross-row constraints. Each cell receives its specific message via
  // customError; the modal's combined summary groups them per-row.
  const doseErrors = useMemo(() => {
    const errs: Record<string, { min?: string; max?: string }> = {};
    doses.forEach((dose, idx) => {
      const prev = doses[idx - 1];
      if (prev && dose.minAgeMonths <= prev.minAgeMonths) {
        errs[dose.id] = {
          ...errs[dose.id],
          min: t('error.dose-min-out-of-order'),
        };
      }
      if (dose.maxAgeMonths < dose.minAgeMonths) {
        errs[dose.id] = {
          ...errs[dose.id],
          max: t('error.dose-max-less-than-min'),
        };
      }
    });
    return errs;
  }, [doses, t]);

  const columns = useMemo(
    (): ColumnDef<VaccineCourseDoseFragment>[] => [
      {
        id: 'doseNumber',
        accessorFn: row => doseIndex(doses, row),
        header: t('label.dose-number'),
        columnType: ColumnType.Number,
        size: 60,
      },
      {
        accessorKey: 'label',
        header: t('label.label'),
        Cell: ({ cell, row: { original: row } }) => (
          <TextInputCell
            cell={cell}
            updateFn={value => updateDose({ ...row, label: value })}
            required
            formError={{
              formId: FORM_ID,
              fieldId: `${row.id}.label`,
              label: t('label.label'),
            }}
          />
        ),
        size: 200,
      },
      {
        accessorKey: 'minAgeMonths',
        header: t('label.from-age'),
        Cell: ({ cell, row: { original: row } }) => (
          <AgeInputCell
            cell={cell}
            updateFn={value => updateDose({ ...row, minAgeMonths: value })}
            formError={{
              formId: FORM_ID,
              fieldId: `${row.id}.minAgeMonths`,
              label: t('label.from-age'),
            }}
            customError={doseErrors[row.id]?.min ?? null}
          />
        ),
        size: 140,
      },
      {
        accessorKey: 'maxAgeMonths',
        header: t('label.to-age'),
        Cell: ({ cell, row: { original: row } }) => (
          <AgeInputCell
            cell={cell}
            updateFn={value => updateDose({ ...row, maxAgeMonths: value })}
            formError={{
              formId: FORM_ID,
              fieldId: `${row.id}.maxAgeMonths`,
              label: t('label.to-age'),
            }}
            customError={doseErrors[row.id]?.max ?? null}
          />
        ),
        size: 140,
      },
      {
        accessorKey: 'customAgeLabel',
        header: t('label.custom-age-label'),
        Cell: ({ cell, row: { original: row } }) => (
          <TextInputCell
            cell={cell}
            updateFn={value => updateDose({ ...row, customAgeLabel: value })}
          />
        ),
      },
      {
        accessorKey: 'minIntervalDays',
        header: t('label.min-interval'),
        Cell: ({ cell, row: { original: row } }) => (
          <NumberInputCell
            cell={cell}
            updateFn={value => updateDose({ ...row, minIntervalDays: value })}
          />
        ),
        size: 100,
      },
      {
        accessorKey: 'delete',
        header: t('label.delete'),
        Cell: ({ row: { original: row } }) => (
          <IconButton
            icon={<DeleteIcon sx={{ height: '0.9em' }} />}
            label={t('label.delete')}
            onClick={() => deleteDose(row.id)}
          />
        ),
        size: 50,
      },
    ],
    [doses, doseErrors, t]
  );

  const table = useSimpleMaterialTable<VaccineCourseDoseFragment>({
    tableId: 'doses-list',
    columns,
    data: doses,
    enableRowSelection: false,
    // When there are no doses we don't render the "Nothing here" placeholder —
    // it pushes the form's <ErrorDisplay> too far down on a fresh form. The
    // empty header row is enough of a hint that the table exists.
    noDataElement: <></>,
  });

  return <MaterialTable table={table} />;
};
