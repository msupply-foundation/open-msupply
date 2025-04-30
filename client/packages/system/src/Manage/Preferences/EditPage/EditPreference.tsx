import React, { useState } from 'react';
import {
  noOtherVariants,
  NothingHere,
  PreferenceValueNodeType,
  Switch,
  isBoolean,
  isNumber,
  UpsertPreferencesInput,
  PreferenceDescriptionNode,
} from '@openmsupply-client/common';
import { getPrefKey } from './getPrefKey';

export const EditPreference = ({
  preference,
  update,
}: {
  preference: PreferenceDescriptionNode;
  update: (input: Partial<UpsertPreferencesInput>) => void;
}) => {
  // preference.value only updates after mutation completes and cache
  // is invalidated - use local state for fast UI change
  const [value, setValue] = useState(preference.value);

  const clientKey = getPrefKey(preference.key);
  if (!clientKey) {
    return 'uh oh';
  }

  switch (preference.valueType) {
    case PreferenceValueNodeType.Boolean:
      if (!isBoolean(value)) {
        return <NothingHere />;
      }
      return (
        <Switch
          checked={value}
          onChange={(_, checked) => {
            setValue(checked);
            update({ [clientKey]: checked });
          }}
        />
      );

    case PreferenceValueNodeType.Integer:
      if (!isNumber(preference.value)) {
        return <NothingHere />;
      }
      // Adding NumericTextInput here would currently get a type error,
      // because there are no editPreference inputs that accept a number
      return <>To be implemented</>;

    default:
      noOtherVariants(preference.valueType);
  }
};
