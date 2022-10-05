import React from 'react';
import {
  LayoutProps,
  rankWith,
  UISchemaElement,
  uiTypeIs,
} from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { SxProps, Typography } from '@mui/material';
import { RegexUtils } from '@common/utils';
import { FORM_LABEL_COLUMN_WIDTH } from '../styleConstants';

export const labelTester = rankWith(3, uiTypeIs('Label'));

type LabelVariant = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p';

type LayoutPropsExtended = LayoutProps & {
  uischema: UISchemaElement & {
    sx?: SxProps;
    text?: string;
    variant?: LabelVariant;
  };
};

const variants: { [key in LabelVariant]: SxProps } = {
  h1: {
    fontSize: '1.8em',
    fontWeight: 'bold',
    textAlign: 'center',
    paddingBottom: 2,
    paddingTop: 1,
  },
  h2: { fontSize: '1.4em', fontWeight: 'bold', textAlign: 'center' },
  h3: {
    fontWeight: 'bold',
    textAlign: 'right',
    width: FORM_LABEL_COLUMN_WIDTH,
    height: '1.5em', // This shouldn't be necessary 🤷‍♂️
    marginTop: '1em',
  },
  h4: {},
  h5: {},
  h6: {},
  p: {},
};

const UIComponent = (props: LayoutPropsExtended) => {
  const {
    uischema: { variant = 'p', sx, text },
    data,
  } = props;
  const variantStyles = variants[variant];
  if (!props.visible) {
    return null;
  }
  return (
    <Typography sx={{ ...variantStyles, ...sx } as SxProps}>
      {RegexUtils.formatTemplateString(text ?? '', data, '')}
    </Typography>
  );
};

export const Label = withJsonFormsLayoutProps(UIComponent);
