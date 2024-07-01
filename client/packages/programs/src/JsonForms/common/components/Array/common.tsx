import React, { useMemo, useState } from 'react';
import {
  ArrayControlProps,
  findUISchema,
  ControlElement,
  composePaths,
  createDefaultValue,
  JsonSchema,
} from '@jsonforms/core';
import { JsonFormsDispatch } from '@jsonforms/react';
import {
  Box,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  PlusCircleIcon,
  MinusCircleIcon,
  ChevronDownIcon,
  useTranslation,
  ConfirmationModal,
  labelWithPunctuation,
} from '@openmsupply-client/common';
import { RegexUtils } from '@common/utils';
import { z, ZodSchema } from 'zod';
import { useZodOptionsValidation } from '../../hooks/useZodOptionsValidation';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
  FORM_GAP,
} from '../../styleConstants';
import { JsonData } from '../../JsonForm';
import { EnumArrayComponent } from './';

export interface UISchemaWithCustomProps extends ControlElement {
  defaultNewItem?: JsonData;
  itemLabel?: string;
}

export interface ArrayControlCustomProps extends ArrayControlProps {
  uischema: UISchemaWithCustomProps;
  removeItems: (path: string, toDelete: number[]) => () => void;
  data: JsonData[] | undefined;
  isElementEditable?: (child: JsonData, index: number) => boolean;
  checkIsError?: (child: JsonData | undefined) => boolean;
  getItemLabel?: (
    child: JsonData,
    index: number,
    isExpanded: boolean
  ) => JSX.Element;
  zOptions?: ZodSchema;
}

export const CommonOptions = z
  .object({
    detail: z
      .object({ type: z.string(), elements: z.array(z.any()) })
      .optional(),
    /**
     * If true, display items in reverse order (newest first)
     */
    reverse: z.boolean().optional(),
    /**
     * If true, all elements will be expanded (Accordions) on load. Otherwise,
     * they'll start closed and only new items will start expanded
     */
    defaultExpanded: z.boolean().optional(),
    /**
     * Restrictions for which elements can be edited
     */
  })
  .strict();

const isStringEnum = (
  schema: JsonSchema,
  _data: JsonData[]
): _data is string[] => {
  return !!schema.enum && schema.type === 'string';
};

export const ArrayCommonComponent = (props: ArrayControlCustomProps) => {
  const t = useTranslation();
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
    getItemLabel,
    checkIsError = () => {},
    zOptions = CommonOptions,
    isElementEditable = () => enabled,
  } = props;
  const { errors: zErrors, options } = useZodOptionsValidation(
    zOptions,
    props.uischema.options
  );

  const defaultExpanded = props.uischema?.options?.['defaultExpanded'] ?? false;

  const [expandedItems, setExpandedItems] = useState<boolean[]>(
    new Array(inputData?.length ?? 0).fill(defaultExpanded)
  );

  const getItemLabelCommon = (child: JsonData, index: number) => {
    return (
      <Typography
        sx={{
          fontWeight: 'bold',
          textAlign: 'end',
          whiteSpace: 'nowrap',
          lineHeight: '32px',
        }}
      >
        {uischema.itemLabel
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
    );
  };

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
    [uischemas, schema, path, uischema, rootSchema]
  );

  if (!props.visible) {
    return null;
  }

  const data = inputData ?? [];
  if (isStringEnum(schema, data)) {
    return <EnumArrayComponent {...props} data={data} />;
  }

  const handleToggle = (index: number) => {
    const newValues = [...expandedItems];
    newValues[index] = !expandedItems[index];
    setExpandedItems(newValues);
  };

  const handleRemoveItem = (index: number) => {
    const newValues = expandedItems.filter((_, i) => i !== index);
    removeItems(path, [index])();
    setExpandedItems(newValues);
    setRemoveIndex(undefined);
  };

  if (zErrors)
    return (
      <Box display="flex" justifyContent="flex-end">
        <Typography color="error">{zErrors}</Typography>
      </Box>
    );

  return (
    <Box display="flex" flexDirection="column" gap={0.5} marginTop={FORM_GAP}>
      <Box display="flex" width="100%" alignItems="center">
        <Box width={FORM_LABEL_COLUMN_WIDTH}>
          <Typography
            sx={{ fontWeight: 'bold', textAlign: 'end', maxWidth: '100%' }}
          >
            {labelWithPunctuation(label)}
          </Typography>
        </Box>
        <Box width={FORM_INPUT_COLUMN_WIDTH} textAlign="right">
          <IconButton
            disabled={!enabled}
            icon={<PlusCircleIcon />}
            label={t('label.add-another')}
            color="primary"
            onClick={() => {
              setExpandedItems([...expandedItems, true]);
              addItem(
                path,
                uischema.defaultNewItem ?? createDefaultValue({})
              )();
            }}
          />
        </Box>
      </Box>
      {data
        .map((child, index) => {
          const isError = checkIsError(child);
          const childPath = composePaths(path, `${index}`);
          const isEditable = isElementEditable(child, index);
          const isExpanded = expandedItems[index] ?? false;
          const itemLabelComponent = getItemLabel
            ? getItemLabel(child, index, isExpanded)
            : getItemLabelCommon(child, index);
          return (
            <Accordion
              key={index}
              defaultExpanded={index === data.length - 1}
              expanded={expandedItems[index]}
              onChange={() => handleToggle(index)}
              sx={{
                border: isError ? '1px solid red' : '',
              }}
            >
              <AccordionSummary
                expandIcon={<ChevronDownIcon />}
                sx={{
                  height: '32',
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
                <Box display="flex" justifyContent="space-between" width="100%">
                  <ConfirmationModal
                    open={removeIndex !== undefined}
                    onConfirm={() => {
                      if (removeIndex !== undefined)
                        handleRemoveItem(removeIndex);
                    }}
                    onCancel={() => setRemoveIndex(undefined)}
                    title={t('label.remove')}
                    message={t('messages.confirm-remove-item')}
                  />
                  <IconButton
                    icon={isEditable ? <MinusCircleIcon /> : null}
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
                  {itemLabelComponent}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <JsonFormsDispatch
                  key={childPath}
                  schema={schema}
                  uischema={childUiSchema || uischema}
                  enabled={isEditable}
                  path={childPath}
                  renderers={renderers}
                />
              </AccordionDetails>
            </Accordion>
          );
        })
        .sort((a, b) =>
          options?.['reverse']
            ? Number(b.key) - Number(a.key)
            : Number(a.key) - Number(b.key)
        )}
    </Box>
  );
};
