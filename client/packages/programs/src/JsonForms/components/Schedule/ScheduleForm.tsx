import React from 'react';
import {
  rankWith,
  ControlProps,
  uiTypeIs,
  ControlElement,
  UISchemaElement,
} from '@jsonforms/core';
import { JsonFormsDispatch, withJsonFormsControlProps } from '@jsonforms/react';
import { Box } from '@openmsupply-client/common';

export const scheduleFormTester = rankWith(10, uiTypeIs('ScheduleForm'));

const UIComponent = (props: ControlProps) => {
  const {
    schema,
    path,
    enabled,
    // renderers
  } = props;

  return (
    <Box>
      <JsonFormsDispatch
        key={`${path}.programId`}
        schema={schema}
        uischema={
          {
            type: 'ProgramSearch',
            scope: '#/properties/programId',
          } as UISchemaElement
        }
        enabled={enabled}
        // path={path}
        //   renderers={renderers}
      />
      <JsonFormsDispatch
        key={`${path}.scheduleId`}
        schema={schema}
        uischema={
          {
            type: 'ScheduleSelector',
            scope: '#/properties/scheduleId',
          } as UISchemaElement
        }
        enabled={enabled}
        // path={path}
        //   renderers={renderers}
      />
      <JsonFormsDispatch
        key={`${path}.periodId`}
        schema={schema}
        uischema={
          {
            type: 'PeriodSearch',
            scope: '#/properties/periodId',
            options: {
              findByProgram: true,
            },
          } as UISchemaElement
        }
        enabled={enabled}
        // path={path}
        //   renderers={renderers}
      />
      <JsonFormsDispatch
        key={`${path}.after`}
        schema={schema}
        uischema={
          {
            type: 'Control',
            scope: '#/properties/after',
            options: {
              dateOnly: true,
            },
          } as ControlElement
        }
        enabled={enabled}
        // path={path}
        //   renderers={renderers}
      />
      <JsonFormsDispatch
        key={`${path}.before`}
        schema={schema}
        uischema={
          {
            type: 'Control',
            scope: '#/properties/before',
            options: {
              dateOnly: true,
            },
          } as ControlElement
        }
        enabled={enabled}
        // path={path}
        //   renderers={renderers}
      />
    </Box>
  );
};

const UIComponentWrapper = (props: ControlProps) => {
  if (!props.visible) {
    return null;
  }
  return <UIComponent {...props} />;
};

export const ScheduleForm = withJsonFormsControlProps(UIComponentWrapper);
