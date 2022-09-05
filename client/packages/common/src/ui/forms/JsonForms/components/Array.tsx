import React, { ComponentType, FC, useMemo, useState } from 'react';
import {
  rankWith,
  schemaTypeIs,
  ArrayControlProps,
  findUISchema,
  ControlElement,
  composePaths,
  createDefaultValue,
  JsonSchema,
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
  FormLabel,
  TextField,
  Autocomplete,
} from '@mui/material';
import {
  IconButton,
  PlusCircleIcon,
  MinusCircleIcon,
  ChevronDownIcon,
  useTranslation,
  ConfirmationModal,
} from '@openmsupply-client/common';
import { RegexUtils } from '@common/utils';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../styleConstants';
import { JsonData } from '../JsonForm';

interface UISchemaWithCustomProps extends ControlElement {
  defaultNewItem?: JsonData;
  itemLabel?: string;
}

interface ArrayControlCustomProps extends ArrayControlProps {
  uischema: UISchemaWithCustomProps;
  removeItems: (path: string, toDelete: number[]) => () => void;
  data: JsonData[] | undefined;
}

interface EnumArrayControlCustomProps extends ArrayControlProps {
  uischema: UISchemaWithCustomProps;
  removeItems: (path: string, toDelete: number[]) => () => void;
  data: string[];
}

export const arrayTester = rankWith(5, schemaTypeIs('array'));

const findIndexOfChanged = (base: string[], newList: string[]): number => {
  for (let i = 0; i < base.length; i++) {
    if (base[i] !== newList[i]) {
      return i;
    }
  }
  if (base.length !== newList.length - 1) throw Error('Unexpected new list');
  return newList.length - 1;
};

const EnumArrayComponent: FC<EnumArrayControlCustomProps> = ({
  data,
  label,
  path,
  schema,
  visible,
  addItem,
  removeItems,
}) => {
  const t = useTranslation('common');
  const [removeIndex, setRemoveIndex] = useState<number | undefined>();

  if (!visible) {
    return null;
  }

  return (
    <>
      <Box
        display="flex"
        alignItems="center"
        gap={2}
        justifyContent="space-around"
        style={{ minWidth: 300 }}
        marginTop={0.5}
      >
        <Box
          style={{ textAlign: 'end', alignSelf: 'start', paddingTop: 5 }}
          flexBasis={FORM_LABEL_COLUMN_WIDTH}
        >
          <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
        </Box>
        <Box flexBasis={FORM_INPUT_COLUMN_WIDTH}>
          <Autocomplete
            multiple
            value={data}
            options={schema.enum ?? []}
            renderInput={params => <TextField {...params} variant="standard" />}
            onChange={(_, value) => {
              const index = findIndexOfChanged(data, value);
              if (index >= data.length) {
                addItem(path, value[index])();
              } else {
                setRemoveIndex(index);
              }
            }}
            disableClearable={true}
          />
        </Box>
      </Box>
      <ConfirmationModal
        open={removeIndex !== undefined}
        onConfirm={() => {
          if (removeIndex !== undefined) {
            removeItems(path, [removeIndex])();
            setRemoveIndex(undefined);
          }
        }}
        onCancel={() => setRemoveIndex(undefined)}
        title={t('label.remove')}
        message={t('messages.confirm-remove-item')}
      />
    </>
  );
};

const isStringEnum = (
  schema: JsonSchema,
  _data: JsonData[]
): _data is string[] => {
  return !!schema.enum && schema.type === 'string';
};

const ArrayComponent = (props: ArrayControlCustomProps) => {
  const t = useTranslation('common');
  const [removeIndex, setRemoveIndex] = useState<number | undefined>();

  const {
    uischema,
    uischemas,
    schema,
    path,
    data: inputData,
    addItem,
    removeItems,
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

  if (!props.visible) {
    return null;
  }

  const data = inputData ?? [];
  if (isStringEnum(schema, data)) {
    return <EnumArrayComponent {...props} data={data} />;
  }
  return (
    <Box display="flex" flexDirection="column" gap={0.5} marginTop={2}>
      <Box display="flex" width="100%" alignItems="center">
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
              uischema.defaultNewItem ?? createDefaultValue(schema)
            )}
          />
        </Box>
      </Box>
      {data.map((child, index) => {
        const childPath = composePaths(path, `${index}`);
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
                <ConfirmationModal
                  open={removeIndex !== undefined}
                  onConfirm={() => {
                    if (removeIndex !== undefined) {
                      removeItems(path, [removeIndex])();
                      setRemoveIndex(undefined);
                    }
                  }}
                  onCancel={() => setRemoveIndex(undefined)}
                  title={t('label.remove')}
                  message={t('messages.confirm-remove-item')}
                />
                <IconButton
                  icon={<MinusCircleIcon />}
                  label={t('label.remove')}
                  color="primary"
                  className="array-remove-icon"
                  sx={{ visibility: 'hidden' }}
                  onClick={e => {
                    setRemoveIndex(index);
                    // Don't toggle the accordion:
                    e.stopPropagation();
                  }}
                />
                <Typography
                  sx={{
                    fontWeight: 'bold',
                    textAlign: 'end',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {uischema?.itemLabel
                    ? RegexUtils.formatTemplateString(
                        uischema?.itemLabel,
                        {
                          ...(typeof child === 'object' ? child : {}),
                          index: index + 1,
                        },
                        ''
                      )
                    : index + 1}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <JsonFormsDispatch
                key={childPath}
                schema={schema}
                uischema={childUiSchema || uischema}
                enabled={enabled}
                path={childPath}
                renderers={renderers}
              />
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
};

export const Array = withJsonFormsArrayControlProps(
  ArrayComponent as ComponentType<ArrayControlProps>
);
