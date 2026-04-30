import React from 'react';
import { rankWith, ControlProps, uiTypeIs } from '@jsonforms/core';
import { useJsonForms, withJsonFormsControlProps } from '@jsonforms/react';
import {
  alpha,
  DetailInputWithLabelRow,
  extractProperty,
  Theme,
  useTranslation,
} from '@openmsupply-client/common';
import { FORM_LABEL_WIDTH, DefaultFormRowSx } from '../styleConstants';
import { FlatButton } from '@common/components';
import { SortAscIcon, SortDescIcon } from '@common/icons';

export const SortToggleTester = rankWith(10, uiTypeIs('SortToggle'));

type SortDirection = 'asc' | 'desc' | null;

const UIComponent = (props: ControlProps) => {
  const { handleChange, label, path, enabled } = props;
  const t = useTranslation();
  const { core } = useJsonForms();

  const sortDirection =
    (extractProperty(core?.data, path) as SortDirection) ?? null;

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
    handleChange(path, newValue);
  };

  return (
    <DetailInputWithLabelRow
      label={label}
      DisabledInput={!enabled}
      labelWidthPercentage={FORM_LABEL_WIDTH}
      sx={DefaultFormRowSx}
      Input={
        <>
          <FlatButton
            label={t('report.ascending')}
            onClick={() => handleClick('asc')}
            startIcon={<SortAscIcon />}
            sx={[getSelectedSx('asc') || {}, { borderRadius: 24 }]}
          />
          <FlatButton
            label={t('report.descending')}
            onClick={() => handleClick('desc')}
            startIcon={<SortDescIcon />}
            sx={[getSelectedSx('desc') || {}, { borderRadius: 24 }]}
          />
        </>
      }
    />
  );
};

export const SortToggle = withJsonFormsControlProps(UIComponent);
