import React, { useState } from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import {
  Autocomplete,
  DetailInputWithLabelRow,
  extractProperty,
  Typography,
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

const PatientProgramSearchOptions = z
  .object({
    programType: z.enum(['immunisation']).optional(),
  })
  .optional();

const UIComponent = (props: ControlProps) => {
  const { errors: zErrors } = useZodOptionsValidation(
    PatientProgramSearchOptions,
    props.uischema.options
  );

  const { handleChange, label, path } = props;
  const { core } = useJsonForms();
  const { data, isLoading } = useProgramList({
    isImmunisation: props.uischema.options?.['programType'] === 'immunisation',
  });
  const [program, setProgram] = useState<ProgramFragment | null>(null);
  const programId = extractProperty(core?.data, 'programId');

  const onChange = async (program: ProgramFragment) => {
    setProgram(program);
    handleChange(path, program.id);
    handleChange('elmisCode', program.elmisCode ?? '');
  };

  if (programId && !program) {
    const program = data?.nodes.find(program => program.id === programId);
    if (program) {
      setProgram(program);
    }
  }

  if (zErrors) return <Typography color="error">{zErrors}</Typography>;

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
          options={data?.nodes ?? []}
          optionKey="name"
          onChange={(_, newVal) =>
            newVal && newVal.id !== program?.id && onChange(newVal)
          }
          value={program ? { label: program.name ?? '', ...program } : null}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          clearable={false}
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
