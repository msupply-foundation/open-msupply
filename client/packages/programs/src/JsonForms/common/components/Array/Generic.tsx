import React, { ComponentType } from 'react';
import { rankWith, schemaTypeIs, ArrayControlProps } from '@jsonforms/core';
import { withJsonFormsArrayControlProps } from '@jsonforms/react';
import {
  CommonOptions,
  ArrayControlCustomProps,
  ArrayCommonComponent,
} from './';

export const arrayTester = rankWith(5, schemaTypeIs('array'));

const ArrayComponent = (props: ArrayControlCustomProps) => {
  return <ArrayCommonComponent {...props} zOptions={CommonOptions} />;
};

export const ArrayControl = withJsonFormsArrayControlProps(
  ArrayComponent as ComponentType<ArrayControlProps>
);
