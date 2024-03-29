import { RegexUtils } from '@common/utils';
import { uiTypeIs, rankWith, ControlProps } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { Typography } from '@openmsupply-client/common';
import React from 'react';
import { z } from 'zod';
import { useZodOptionsValidation } from '../hooks/useZodOptionsValidation';

export const headerTester = rankWith(10, uiTypeIs('Header'));

const Options = z
  .object({
    header: z.string(),
    subheader: z.string(),
  })
  .strict();

type Options = z.infer<typeof Options>;

const UIComponent = (props: ControlProps) => {
  const { data } = props;
  const { options } = useZodOptionsValidation(Options, props.uischema.options);

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
        {RegexUtils.formatTemplateString(options?.header ?? '', data, '')}
      </Typography>
      <Typography
        sx={{
          fontSize: '1.4em',
          fontWeight: 'bold',
          textAlign: 'center',
          paddingBottom: 2,
        }}
      >
        {RegexUtils.formatTemplateString(options?.subheader ?? '', data, '')}
      </Typography>
    </>
  );
};

export const Header = withJsonFormsControlProps(UIComponent);
