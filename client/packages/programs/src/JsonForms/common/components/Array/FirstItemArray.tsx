import React, { ComponentType, useMemo } from 'react';
import {
  rankWith,
  ArrayControlProps,
  findUISchema,
  ControlElement,
  composePaths,
  uiTypeIs,
  JsonSchema7,
  ControlProps,
} from '@jsonforms/core';
import {
  withJsonFormsArrayControlProps,
  JsonFormsDispatch,
} from '@jsonforms/react';
import {
  Box,
  Typography,
  labelWithPunctuation,
} from '@openmsupply-client/common';

import { FORM_LABEL_COLUMN_WIDTH } from '../../styleConstants';
import { JsonData } from '../../JsonForm';

interface UISchemaWithCustomProps extends ControlElement {
  defaultNewItem?: JsonData;
  itemLabel?: string;
}

interface FirstItemArrayControlCustomProps
  extends ArrayControlProps,
    ControlProps {
  uischema: UISchemaWithCustomProps;
  data: JsonData[];
  options?: {
    showLabel?: boolean;
  };
}

export const firstItemArrayTester = rankWith(10, uiTypeIs('FirstItemArray'));

const FirstItemArrayComponent = (props: FirstItemArrayControlCustomProps) => {
  const {
    uischema,
    uischemas,
    schema,
    path,
    enabled,
    visible,
    label,
    rootSchema,
    renderers,
    options,
  } = props;

  const childUiSchema = useMemo(
    () =>
      findUISchema(
        uischemas ?? [],
        schema,
        uischema.scope,
        path,
        undefined,
        uischema,
        rootSchema
      ),
    [uischemas, schema, uischema.scope, path, uischema, rootSchema]
  );

  // If there are definitions they need to be added to the child schema
  const schemaWithDefs = {
    definitions: rootSchema.definitions as Record<string, JsonSchema7>,
    ...(schema as JsonSchema7),
  };

  if (!visible) return null;

  const childPath = composePaths(path, `${0}`);
  return (
    <Box display="flex" flexDirection="column" gap={0.5}>
      {options?.showLabel ? (
        <Box display="flex" width="100%" gap={2} alignItems="center">
          <Box width={FORM_LABEL_COLUMN_WIDTH}>
            <Typography sx={{ fontWeight: 'bold', textAlign: 'end' }}>
              {labelWithPunctuation(label)}
            </Typography>
          </Box>
        </Box>
      ) : null}

      <JsonFormsDispatch
        key={childPath}
        schema={schemaWithDefs}
        uischema={childUiSchema || uischema}
        enabled={enabled}
        path={childPath}
        renderers={renderers}
      />
    </Box>
  );
};

export const FirstItemArray = withJsonFormsArrayControlProps(
  FirstItemArrayComponent as ComponentType<ArrayControlProps>
);
