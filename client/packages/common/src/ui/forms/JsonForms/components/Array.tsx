import React, { ComponentType, FC, useMemo, useState } from 'react';
import {
  rankWith,
  schemaTypeIs,
  ArrayControlProps,
  findUISchema,
  ControlElement,
  composePaths,
  createDefaultValue,
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
} from '@mui/material';
import {
  IconButton,
  PlusCircleIcon,
  MinusCircleIcon,
  ChevronDownIcon,
  useTranslation,
  Select,
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
  data: JsonData[];
}

export const arrayTester = rankWith(5, schemaTypeIs('array'));

const EnumArrayComponent: FC<ArrayControlCustomProps> = ({
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

  const options = schema.enum
    ? schema.enum
        .filter(it => !(data ?? []).includes(it))
        .map((option: string) => ({
          label: option,
          value: option,
        }))
    : [];

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
        <Box style={{ textAlign: 'end' }} flexBasis={FORM_LABEL_COLUMN_WIDTH}>
          <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
        </Box>
        <Box flexBasis={FORM_INPUT_COLUMN_WIDTH}>
          <Select
            sx={{ minWidth: 100 }}
            options={options}
            value={''}
            placeholder={'Select'}
            onChange={e => addItem(path, e.target.value)()}
          />
        </Box>
      </Box>
      {(data ? data : []).map((child, index) => {
        return (
          <Box
            display="flex"
            flexDirection="row"
            key={index}
            sx={{
              '&:hover .array-remove-icon': { visibility: 'visible' },
            }}
            alignContent="start"
          >
            <Box flexBasis={FORM_LABEL_COLUMN_WIDTH}></Box>
            <Typography
              flexBasis={FORM_INPUT_COLUMN_WIDTH}
              sx={{
                textAlign: 'start',
                alignSelf: 'center',
                marginLeft: '2em',
              }}
              overflow={'hidden'}
            >
              {`${child}`}
            </Typography>
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
              sx={{
                position: 'relative',
                visibility: 'hidden',
                right: 0,
              }}
              onClick={() => setRemoveIndex(index)}
            />
          </Box>
        );
      })}
    </>
  );
};

const ArrayComponent = (props: ArrayControlCustomProps) => {
  const t = useTranslation('common');
  const [removeIndex, setRemoveIndex] = useState<number | undefined>();

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
  if (schema.enum && schema.type === 'string') {
    return <EnumArrayComponent {...props} />;
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
      {(data ? data : []).map((child, index) => {
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
                          ...child,
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
