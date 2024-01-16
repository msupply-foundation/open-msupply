import React, { FC, useState } from 'react';
import { useUrlQuery } from '@common/hooks';
import { Switch } from '@common/components';
import { FilterDefinitionCommon } from './FilterMenu';

export interface BooleanFilterDefinition extends FilterDefinitionCommon {
  type: 'boolean';
}

export const BooleanFilter: FC<{
  filterDefinition: BooleanFilterDefinition;
}> = ({ filterDefinition }) => {
  const { urlParameter, name } = filterDefinition;
  const { urlQuery, updateQuery } = useUrlQuery();
  const urlValue = urlQuery[urlParameter] as boolean;
  const [value, setValue] = useState(urlValue);

  const handleChange = (
    _: React.SyntheticEvent<Element, Event>,
    checked: boolean
  ) => {
    setValue(checked);
    updateQuery({ [urlParameter]: checked });
  };

  return (
    <Switch
      switchSx={{
        marginTop: 0.2,
      }}
      labelSx={{
        marginTop: 1.5,
      }}
      label={name}
      checked={value}
      onChange={handleChange}
      size="medium"
    />
  );
};
