import React, { ComponentType, useMemo } from 'react';
import {
  rankWith,
  ArrayControlProps,
  findUISchema,
  ControlElement,
  composePaths,
  uiTypeIs,
} from '@jsonforms/core';
import {
  withJsonFormsArrayControlProps,
  JsonFormsDispatch,
} from '@jsonforms/react';
import { Box, Typography } from '@mui/material';

import { FORM_LABEL_COLUMN_WIDTH } from '../styleConstants';
import { JsonData } from '../JsonForm';

interface UISchemaWithCustomProps extends ControlElement {
  defaultNewItem?: JsonData;
  itemLabel?: string;
}

interface FirstItemArrayControlCustomProps extends ArrayControlProps {
  uischema: UISchemaWithCustomProps;
  data: JsonData[];
}

export const firstItemArrayTester = rankWith(
  10,
  uiTypeIs('FirstItemArrayControl')
);

const FirstItemArrayComponent = (props: FirstItemArrayControlCustomProps) => {
  const {
    uischema,
    uischemas,
    schema,
    path,
    enabled,
    label,
    rootSchema,
    renderers,
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

  const childPath = composePaths(path, `${0}`);
  return (
    <Box display="flex" flexDirection="column" gap={0.5} marginTop={2}>
      <Box display="flex" width="100%" gap={2} alignItems="center">
        <Box width={FORM_LABEL_COLUMN_WIDTH}>
          <Typography sx={{ fontWeight: 'bold', textAlign: 'end' }}>
            {label}:
          </Typography>
        </Box>
      </Box>

      <JsonFormsDispatch
        key={childPath}
        schema={schema}
        uischema={childUiSchema || uischema}
        enabled={enabled}
        path={childPath}
        renderers={renderers}
      />
    </Box>
  );
};

export const FirstItemArray = withJsonFormsArrayControlProps(
  FirstItemArrayComponent as ComponentType<FirstItemArrayControlCustomProps>
);
