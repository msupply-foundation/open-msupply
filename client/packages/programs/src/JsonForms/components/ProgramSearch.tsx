import React, { useState } from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import {
  Autocomplete,
  CLEAR,
  DetailInputWithLabelRow,
  extractProperty,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import {
  DefaultFormRowSx,
  FORM_LABEL_WIDTH,
  useZodOptionsValidation,
} from '../common';
import { ProgramFragment, useProgramList } from '../../api';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import { z } from 'zod';

export const programSearchTester = rankWith(10, uiTypeIs('ProgramSearch'));

type AllOptionsType = {
  name: string;
  id: string;
};

const PatientProgramSearchOptions = z
  .object({
    programType: z.enum(['immunisation']).optional(),
    allProgramsOption: z.boolean().optional(),
  })
  .optional();

const UIComponent = (props: ControlProps) => {
  const t = useTranslation();

  const { errors: zErrors } = useZodOptionsValidation(
    PatientProgramSearchOptions,
    props.uischema.options
  );

  const { handleChange, label, path } = props;
  const { core } = useJsonForms();

  const { data, isLoading } = useProgramList(
    props.uischema.options?.['programType'] === 'immunisation'
      ? {
          isImmunisation: true,
        }
      : {}
  );
  const [program, setProgram] = useState<ProgramFragment | null>(null);
  const programId = extractProperty(core?.data, 'programId');

  const onChange = async (program: ProgramFragment | null) => {
    setProgram(program);

    const isAllPrograms = program?.id === 'AllProgramsSelector';
    const programId = isAllPrograms ? undefined : program?.id;
    const elmisCode = isAllPrograms
      ? undefined
      : (program?.elmisCode ?? undefined);
    const fetchAllPrograms = program !== null && isAllPrograms;

    handleChange(path, programId);
    handleChange('elmisCode', elmisCode);
    handleChange('fetchAllPrograms', fetchAllPrograms);
  };

  if (programId && !program) {
    const program = data?.nodes.find(program => program.id === programId);
    if (program) {
      setProgram(program);
    }
  }

  if (zErrors) return <Typography color="error">{zErrors}</Typography>;

  const allProgramsOptionRenderer: AllOptionsType = {
    id: 'AllProgramsSelector',
    name: t('label.all-programs'),
  };

  const programs = data?.nodes ?? [];

  const programOptions =
    programs.length > 1 && props.uischema.options?.['allProgramsOption']
      ? [...programs, allProgramsOptionRenderer]
      : programs;

  return (
    <DetailInputWithLabelRow
      sx={DefaultFormRowSx}
      label={label}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      inputAlignment={'start'}
      Input={
        <Autocomplete
          fullWidth
          loading={isLoading}
          options={programOptions}
          optionKey="name"
          onChange={(_, newVal) => {
            if (!newVal) return;
            newVal &&
              newVal.id !== program?.id &&
              onChange(newVal as ProgramFragment);
          }}
          onInputChange={(
            _event: React.SyntheticEvent<Element, Event>,
            _value: string,
            reason: string
          ) => {
            if (reason === CLEAR) {
              onChange(null);
            }
          }}
          value={program ? { label: program.name ?? '', ...program } : null}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          clearable={props.uischema.options?.['clearable'] ?? false}
        />
      }
    />
  );
};

const UIComponentWrapper = (props: ControlProps) => {
  if (!props.visible) {
    return null;
  }
  return <UIComponent {...props} />;
};

export const ProgramSearch = withJsonFormsControlProps(UIComponentWrapper);
