import React, { ComponentType, useMemo } from 'react';
import {
  rankWith,
  schemaTypeIs,
  ArrayControlProps,
  findUISchema,
  JsonFormsUISchemaRegistryEntry,
  ControlElement,
  Layout,
} from '@jsonforms/core';
import {
  withJsonFormsArrayControlProps,
  JsonFormsDispatch,
} from '@jsonforms/react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  IconButton,
  PlusCircleIcon,
  MinusCircleIcon,
  ChevronDownIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { RegexUtils } from '@common/utils';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../styleConstants';
import { JsonData } from '../useJsonForms';

interface UISchemaWithCustomProps extends ControlElement {
  defaultNewItem?: JsonData;
  itemLabel?: string;
}

interface ArrayControlCustomProps extends ArrayControlProps {
  uischema: UISchemaWithCustomProps;
  removeItems: (path: string, toDelete: number[]) => () => void;
  data: JsonData[];
}

interface ArrayUiSchema extends Layout {
  elements: ControlElement[];
}

export const arrayTester = rankWith(5, schemaTypeIs('array'));

const UIComponent = (props: ArrayControlCustomProps) => {
  const t = useTranslation('common');
  const {
    uischema,
    uischemas,
    schema,
    path,
    data,
    addItem,
    removeItems,
    enabled,
    label,
    rootSchema,
  } = props;

  const foundUISchema = useMemo(
    () =>
      findUISchema(
        uischemas as JsonFormsUISchemaRegistryEntry[],
        schema,
        uischema.scope,
        path,
        undefined,
        uischema,
        rootSchema
      ),
    []
  ) as ArrayUiSchema;

  return (
    <Box display="flex" flexDirection="column" gap={0.5} marginTop={2}>
      <Box display="flex" width="100%" gap={2} alignItems="center">
        <Box width={FORM_LABEL_COLUMN_WIDTH}>
          <Typography sx={{ fontWeight: 'bold', textAlign: 'end' }}>
            {label}:
          </Typography>
        </Box>
        <Box width={FORM_INPUT_COLUMN_WIDTH} textAlign="right">
          <IconButton
            icon={<PlusCircleIcon />}
            label={t('label.add-another')}
            color="primary"
            onClick={addItem(
              path,
              uischema.defaultNewItem ?? createNewItem(foundUISchema)
            )}
          />
        </Box>
      </Box>
      {data.map((child, index) => {
        return (
          <Accordion
            key={index}
            defaultExpanded={index === data.length - 1}
            sx={{
              mt: '0 !important',
              mb: index === data.length - 1 ? '20px !important' : 1,
            }}
          >
            <AccordionSummary
              expandIcon={<ChevronDownIcon />}
              sx={{
                '&:hover .array-remove-icon': { visibility: 'visible' },
                '.MuiAccordionSummary-content': {
                  margin: '5px !important',
                },
                '.Mui-expanded': {
                  marginBottom: '0 !important',
                },
              }}
              style={{ margin: 0, minHeight: 0 }}
            >
              <Box
                display="flex"
                width={FORM_LABEL_COLUMN_WIDTH}
                justifyContent="space-between"
                alignItems="center"
              >
                <IconButton
                  icon={<MinusCircleIcon />}
                  label={t('label.remove')}
                  color="primary"
                  className="array-remove-icon"
                  sx={{ visibility: 'hidden' }}
                  onClick={removeItems(path, [index])}
                />
                <Typography
                  sx={{
                    fontWeight: 'bold',
                    textAlign: 'end',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {uischema?.itemLabel
                    ? RegexUtils.formatTemplateString(uischema?.itemLabel, {
                        ...child,
                        index: index + 1,
                      })
                    : index + 1}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <JsonFormsDispatch
                key={index}
                schema={schema}
                uischema={foundUISchema}
                enabled={enabled}
                path={`${path}.${index}`}
              />
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

export const Array = withJsonFormsArrayControlProps(
  UIComponent as ComponentType<ArrayControlProps>
);

const createNewItem = (foundUISchema: ArrayUiSchema) => {
  try {
    const fields = foundUISchema.elements.map(e => [
      e.scope.split('/').pop(),
      undefined,
    ]);
    return Object.fromEntries(fields);
  } catch {
    return {};
  }
};
