import React, { useState } from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import {
  Autocomplete,
  DetailInputWithLabelRow,
} from '@openmsupply-client/common';
import { DefaultFormRowSx, FORM_LABEL_WIDTH } from '../common';
import { ProgramFragment, useProgramList } from '../../api';
import { withJsonFormsControlProps } from '@jsonforms/react';

export const programSearchTester = rankWith(10, uiTypeIs('ProgramSearch'));

const UIComponent = (props: ControlProps) => {
  const { handleChange, label, path } = props;
  const { data, isLoading } = useProgramList(false);
  const [program, setProgram] = useState<ProgramFragment | null>(null);

  const onChange = async (program: ProgramFragment) => {
    setProgram(program);
    handleChange(path, program.id);
    handleChange('elmisCode', program.elmisCode);
  };

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
