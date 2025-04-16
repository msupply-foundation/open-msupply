import React from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
// import { useTranslation, LocaleKey } from '@openmsupply-client/common';
// import { FORM_LABEL_WIDTH, DefaultFormRowSx } from '../styleConstants';
import { ButtonWithIcon } from '@common/components';
import { SortAscIcon, SortDescIcon } from '@common/icons';
import { DetailInputWithLabelRow } from 'packages/common/src';

export const SortToggleTester = rankWith(10, uiTypeIs('SortToggle'));

const UIComponent = (props: ControlProps) => {
  const { data, handleChange, label, path, enabled } = props;
  // const t = useTranslation();

  if (!props.visible) {
    return null;
  }

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    const value = event.currentTarget.value;
    const newValue = data === value ? null : value;
    handleChange(path, newValue);
    console.log('CHANGE', value);
  };

  return (
    <>
      <DetailInputWithLabelRow
        label={label}
        DisabledInput={!enabled}
        Input={
          <>
            <ButtonWithIcon
              label={'Ascending'}
              onClick={handleClick}
              Icon={<SortAscIcon />}
              value={'asc'}
            />
            <ButtonWithIcon
              label={'Descending'}
              onClick={handleClick}
              Icon={<SortDescIcon />}
              value={'desc'}
            />
          </>
        }
      />
    </>
  );
};

export const SortToggle = withJsonFormsControlProps(UIComponent);
