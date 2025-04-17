import React, { useState } from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
// import { useTranslation, LocaleKey } from '@openmsupply-client/common';
// import { FORM_LABEL_WIDTH, DefaultFormRowSx } from '../styleConstants';
import { FlatButton } from '@common/components';
import { SortAscIcon, SortDescIcon } from '@common/icons';
import { alpha, DetailInputWithLabelRow, Theme } from 'packages/common/src';

export const SortToggleTester = rankWith(10, uiTypeIs('SortToggle'));

type SortDirection = 'asc' | 'desc' | null;

const UIComponent = (props: ControlProps) => {
  const { handleChange, label, path, enabled } = props;
  // const t = useTranslation();
  const [sortDirection, setSortDirection] = useState<SortDirection>();

  if (!props.visible) {
    return null;
  }

  const selectedStyles = (theme: Theme) => ({
    fontWeight: 'bold',
    backgroundColor: alpha(theme.palette.primary.main, 0.3),
    '&:hover': {
      backgroundColor: alpha(theme.palette.primary.main, 0.3),
    },
  });

  const getSelectedSx = (value: SortDirection) =>
    sortDirection === value ? selectedStyles : undefined;

  const handleClick = (value: SortDirection) => {
    const newValue = sortDirection === value ? null : value;
    setSortDirection(newValue);
    handleChange(path, sortDirection);
  };

  return (
    <>
      <DetailInputWithLabelRow
        label={label}
        DisabledInput={!enabled}
        Input={
          <>
            <FlatButton
              label={'Ascending'}
              onClick={() => handleClick('asc')}
              startIcon={<SortAscIcon />}
              sx={[getSelectedSx('asc') || {}, { borderRadius: 24 }]}
            />
            <FlatButton
              label={'Descending'}
              onClick={() => handleClick('desc')}
              startIcon={<SortDescIcon />}
              sx={[getSelectedSx('desc') || {}, { borderRadius: 24 }]}
            />
          </>
        }
      />
    </>
  );
};

export const SortToggle = withJsonFormsControlProps(UIComponent);
