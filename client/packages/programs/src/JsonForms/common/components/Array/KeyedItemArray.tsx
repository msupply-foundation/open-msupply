import React, { ComponentType, useEffect, useMemo, useState } from 'react';
import {
  rankWith,
  ArrayControlProps,
  findUISchema,
  ControlElement,
  composePaths,
  uiTypeIs,
  ControlProps,
} from '@jsonforms/core';
import {
  withJsonFormsArrayControlProps,
  JsonFormsDispatch,
} from '@jsonforms/react';
import { Typography } from '@openmsupply-client/common';

import { JsonData } from '../../JsonForm';
import { z } from 'zod';
import { useZodOptionsValidation } from '../../hooks/useZodOptionsValidation';

const Options = z
  .object({
    /** The field in the object which is used to extract the keyValue */
    keyField: z.string(),
    keyValue: z.string(),
    detail: z.any().optional(),
  })
  .strict();
type Options = z.infer<typeof Options>;

interface UISchemaWithCustomProps extends ControlElement {
  defaultNewItem?: JsonData;
  itemLabel?: string;
}

interface KeyedItemArrayControlCustomProps
  extends ArrayControlProps,
    ControlProps {
  uischema: UISchemaWithCustomProps;
  data: JsonData[];
  options: Options;
}

export const keyedItemArrayTester = rankWith(10, uiTypeIs('KeyedItemArray'));

const KeyedItemArrayComponent: ComponentType<
  KeyedItemArrayControlCustomProps
> = (props: KeyedItemArrayControlCustomProps) => {
  const {
    uischema,
    uischemas,
    schema,
    path,
    enabled,
    visible,
    rootSchema,
    renderers,
    data,
    handleChange,
  } = props;

  const [index, setIndex] = useState<number>(-1);
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    uischema.options
  );

  useEffect(() => {
    if (!options) return;
    const arrayData = data ?? [];
    const elementIndex = arrayData.findIndex(it => {
      if (!it || typeof it !== 'object' || Array.isArray(it)) return;

      return it[options.keyField] === options.keyValue;
    });
    if (elementIndex >= 0) {
      // Only set the index when the entry exists otherwise the renderer might overwrite the object
      // created below, removing the the `keyField` while doing so...
      setIndex(elementIndex);
      return;
    }
    arrayData.push({
      [options.keyField]: options.keyValue,
    });
    handleChange(path, arrayData);
  }, [options, data]);

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

  const childPath = composePaths(path, `${index}`);

  if (zErrors) {
    return <Typography color="error">{zErrors}</Typography>;
  }

  if (!visible || index < 0) return null;

  return (
    <JsonFormsDispatch
      key={childPath}
      schema={schema}
      uischema={childUiSchema || uischema}
      enabled={enabled}
      path={childPath}
      renderers={renderers}
    />
  );
};

/**
 * Displays the first item from an array of objects which contains a `keyField` with a matching
 * `keyValue`.
 *
 * For example, with the config `keyField: "key"` and `keyValue: "KeyValue"` the second item from
 * the following list will be displayed.
 * `[{"key": "Value1", ...}, {"key": "KeyValue", ...}]`
 *
 * How the object is displayed is configured using a default `detail` option.
 */
export const KeyedItemArray = withJsonFormsArrayControlProps(
  KeyedItemArrayComponent as ComponentType<ArrayControlProps>
);
