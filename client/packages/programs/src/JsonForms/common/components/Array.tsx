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
  useFormatDateTime,
} from '@openmsupply-client/common';
import { RegexUtils } from '@common/utils';
import { z } from 'zod';
import { useZodOptionsValidation } from '../useZodOptionsValidation';
import {
  FORM_LABEL_COLUMN_WIDTH,
  FORM_INPUT_COLUMN_WIDTH,
} from '../styleConstants';
import { DateUtils } from '@common/intl';
import { JsonData } from '../JsonForm';
import parse from 'autosuggest-highlight/parse';
import match from 'autosuggest-highlight/match';

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

const Options = z
  .object({
    detail: z.object({ type: z.string(), elements: z.array(z.any()) }),
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
    editRestrictions: z
      .object({
        /**
         * If true, only the newest note can be edited
         */
        latest: z.boolean().optional(),
        /**
         * If true, the element's data.authorId field must match the currently logged-in user (used for Notes)
         */
        isCurrentUser: z.boolean().optional(),
        /**
         * Number in days. Timestamp (data.created) must be less than this many
         * days in the past (used for Notes)
         */
        maxAge: z.number().optional(),
        // Add more as required
      })
      .optional(),
  })
  .strict()
  .optional();

type Options = z.infer<typeof Options>;

export const arrayTester = rankWith(5, schemaTypeIs('array'));

// Finds the index where an item has been removed from newList. It is assumed
// that the removal of an item is the only change between both lists. Thus,
// length of newList must be one less than the length of the base list
const findIndexOfRemoved = (base: string[], newList: string[]): number => {
  if (base.length - 1 !== newList.length) {
    throw Error(
      'Unexpected list length, newList.length must be one less than base.length.'
    );
  }

  for (let i = 0; i < newList.length; i++) {
    if (base[i] !== newList[i]) {
      return i;
    }
  }
  // last item must have been removed
  return base.length - 1;
};

const sortOptions = (options: string[]) => {
  const sortedOptions = options.sort((a, b) => a.localeCompare(b));
  return sortedOptions;
};

const searchRanking = {
  STARTS_WITH: 2,
  CONTAINS: 1,
  NO_MATCH: 0,
} as const;

const filterOptions = (
  options: string[],
  { inputValue }: { inputValue: string }
) => {
  const searchTerm = inputValue.toLowerCase();
  const filteredOptions = options
    .map(option => {
      const lowerCaseOption = option.toLowerCase();

      const rank = lowerCaseOption.startsWith(searchTerm)
        ? searchRanking.STARTS_WITH
        : lowerCaseOption.includes(searchTerm)
        ? searchRanking.CONTAINS
        : searchRanking.NO_MATCH;
      return { option, rank };
    })
    .filter(({ rank }) => rank !== searchRanking.NO_MATCH)
    .sort((a, b) => b.rank - a.rank)
    .map(({ option }) => option);

  return filteredOptions;
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
        marginTop={1}
      >
        <Box
          style={{ textAlign: 'end', alignSelf: 'start', paddingTop: 5 }}
          flexBasis={FORM_LABEL_COLUMN_WIDTH}
        >
          <FormLabel sx={{ fontWeight: 'bold' }}>{label}:</FormLabel>
        </Box>
        <Box sx={{ width: FORM_INPUT_COLUMN_WIDTH }}>
          <Autocomplete
            multiple
            sx={{
              '& .MuiInput-root': {
                borderRadius: '8px',
                height: '100%',
                backgroundColor: 'background.menu',
                padding: '5px',
              },
              '& .MuiInput-root:before': {
                border: 'none',
              },
              '& .MuiInput-root:after': {
                color: 'gray.dark',
                borderBottomColor: 'secondary.main',
              },
              '& .MuiInput-root:focus:before': {
                borderRadius: '8px 8px 0px 0px',
              },
              '& .MuiInput-root:hover:before': {
                borderRadius: '8px 8px 0px 0px',
              },
              '& .MuiChip-root': {
                backgroundColor: 'secondary.light',
                height: 'inherit',
                color: theme => theme.typography.login.color,
              },
              '& .MuiChip-deleteIcon': {
                color: theme => `${theme.palette.background.white} !important`,
              },
            }}
            value={data}
            options={sortOptions(schema.enum ?? [])}
            filterOptions={filterOptions}
            renderOption={(props, option, { inputValue }) => {
              const matches = match(option, inputValue, {
                insideWords: true,
              });
              const parts = parse(option, matches);

              return (
                <li {...props}>
                  <div>
                    {parts.map((part, index) => (
                      <span
                        key={index}
                        style={{
                          fontWeight: part.highlight ? 600 : 400,
                        }}
                      >
                        {part.text}
                      </span>
                    ))}
                  </div>
                </li>
              );
            }}
            renderInput={params => <TextField {...params} variant="standard" />}
            onChange={(_, value) => {
              if (value.length - 1 === data.length) {
                addItem(path, value[value.length - 1])();
              } else {
                const index = findIndexOfRemoved(data, value);
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
  const { localisedDateTime } = useFormatDateTime();
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
    config,
  } = props;
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    props.uischema.options
  );

  const defaultExpanded = props.uischema?.options?.['defaultExpanded'] ?? false;

  const [expandedItems, setExpandedItems] = useState<boolean[]>(
    new Array(inputData?.length ?? 0).fill(defaultExpanded)
  );

  const isNotesArray = options?.detail?.elements[0]?.type === 'Note';

  const isElementEditable = (child: any, index: number) => {
    if (!enabled) return false;
    if (!options?.editRestrictions) return true;

    const restrictions = options.editRestrictions;

    // Must be editable if no timestamp (means it's just created)
    if (!child.created) return true;

    // Only allow the latest element to be edited
    if (restrictions?.latest && index !== data.length - 1) return false;

    // Author must match the current user
    if (
      restrictions?.isCurrentUser &&
      child?.authorId &&
      child.authorId !== config.user.id
    )
      return false;

    // Must not be older than `maxAge` days
    if (DateUtils.ageInDays(child.created) >= 1) return false;

    return true;
  };

  const getItemLabel = (child: any, index: number) => {
    const isExpanded = expandedItems[index];

    // For most arrays, or Notes with an explicit itemLabel pattern
    if (uischema.itemLabel || !isNotesArray) {
      return (
        <Typography
          sx={{
            fontWeight: 'bold',
            textAlign: 'end',
            whiteSpace: 'nowrap',
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
    }

    // For Notes:
    const {
      text = '',
      created,
      authorName,
    } = (inputData ? inputData[index] : {}) as {
      text?: string;
      created?: string;
      authorName?: string;
    };

    return (
      <div>
        {!isExpanded ? (
          <Typography
            sx={{
              textAlign: 'right',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 350,
            }}
          >
            {inputData && text}
            <br />
            <Typography
              component="span"
              sx={{
                textAlign: 'right',
                fontSize: '90%',
                color: 'gray.dark',
              }}
            >
              {created && `${authorName} (${localisedDateTime(created)})`}
            </Typography>
          </Typography>
        ) : null}
      </div>
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
    [uischemas, schema, uischema.scope, path, uischema, rootSchema]
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
        <Typography color="red">{zErrors}</Typography>
      </Box>
    );

  return (
    <Box display="flex" flexDirection="column" gap={0.5} marginTop={2}>
      <Box display="flex" width="100%" alignItems="center">
        <Box width={FORM_LABEL_COLUMN_WIDTH}>
          <Typography
            sx={{ fontWeight: 'bold', textAlign: 'end', maxWidth: '100%' }}
          >
            {label}:
          </Typography>
        </Box>
        <Box width={FORM_INPUT_COLUMN_WIDTH} textAlign="right">
          <IconButton
            icon={<PlusCircleIcon />}
            label={t('label.add-another')}
            color="primary"
            onClick={() => {
              setExpandedItems([...expandedItems, true]);
              addItem(
                path,
                uischema.defaultNewItem ?? createDefaultValue(schema)
              )();
            }}
          />
        </Box>
      </Box>
      {data
        .map((child, index) => {
          const childPath = composePaths(path, `${index}`);
          const isEditable = isElementEditable(child, index);
          const itemLabelComponent = getItemLabel(child, index);
          return (
            <Accordion
              key={index}
              defaultExpanded={index === data.length - 1}
              expanded={expandedItems[index]}
              onChange={() => handleToggle(index)}
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
          uischema.options?.['reverse']
            ? (b.key as number) - (a.key as number)
            : (a.key as number) - (b.key as number)
        )}
    </Box>
  );
};

export const ArrayControl = withJsonFormsArrayControlProps(
  ArrayComponent as ComponentType<ArrayControlProps>
);
