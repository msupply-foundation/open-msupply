import { RegexUtils } from '@common/utils';
import {
  LayoutProps,
  uiTypeIs,
  rankWith,
  UISchemaElement,
} from '@jsonforms/core';
import { withJsonFormsLayoutProps } from '@jsonforms/react';
import { Typography } from '@mui/material';
import React from 'react';

export const headerTester = rankWith(10, uiTypeIs('Header'));

type HeaderProps = LayoutProps & {
  uischema: UISchemaElement & {
    header?: string;
    subHeader?: string;
  };
};

const UIComponent = (props: HeaderProps) => {
  const { uischema, data } = props;
  if (!props.visible) {
    return null;
  }

  return (
    <>
      <Typography
        sx={{
          fontSize: '1.8em',
          fontWeight: 'bold',
          textAlign: 'center',
          paddingTop: 1,
        }}
      >
      {RegexUtils.formatTemplateString(uischema?.header ?? '', data, '')}
      </Typography>
      <Typography
        sx={{
          fontSize: '1.4em',
          fontWeight: 'bold',
          textAlign: 'center',
          paddingBottom: 2,
        }}
      >
      {RegexUtils.formatTemplateString(uischema?.subHeader ?? '', data, '')}
      </Typography>
    </>
  );
};

export const Header = withJsonFormsLayoutProps(UIComponent);
