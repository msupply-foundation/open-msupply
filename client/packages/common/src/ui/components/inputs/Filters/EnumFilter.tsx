import React, { FC, useState } from 'react';
import { useUrlQuery } from '@common/hooks';
import { Select } from '@common/components';
// import { useTranslation } from '@common/intl';
import { EndAdornment, FilterDefinitionCommon } from './FilterRoot';

export interface EnumFilterDefinition extends FilterDefinitionCommon {
  type: 'enum';
  options: EnumOption[];
}

type EnumOption = { label: string; value: string };

export const EnumFilter: FC<{
  filterDefinition: EnumFilterDefinition;
  remove: () => void;
}> = ({ filterDefinition, remove }) => {
  const { urlParameter, options, name, placeholder } = filterDefinition;
  const [loading, setLoading] = useState(false);
  const { urlQuery, updateQuery } = useUrlQuery();
  const [value, setValue] = useState<EnumOption | undefined | ''>(
    options.find(option => option.value === urlQuery[urlParameter]) ?? undefined
  );

  const handleChange = (option: EnumOption | null | '') => {
    setLoading(true);
    if (option === null || option === '') {
      setValue('');
      updateQuery({ [urlParameter]: '' });
    } else {
      setValue(option);
      updateQuery({ [urlParameter]: option.value });
    }
    setLoading(false);
  };

  return (
    <>
      <Select
        options={options}
        placeholder={name}
        InputProps={{
          endAdornment: (
            <EndAdornment
              isLoading={loading}
              hasValue={!!value}
              onClear={remove}
            />
          ),
          sx: {
            width: '220px',
          },
          placeholder,
        }}
        sx={{
          '& .MuiInputLabel-root': {
            zIndex: 100,
            top: '4px',
            left: '8px',
            color: 'gray.main',
          },
          '& .MuiInputLabel-root.Mui-focused': {
            color: 'secondary.main',
          },
        }}
        label={name}
        value={value}
        onChange={e =>
          handleChange(options.find(opt => opt.value === e.target.value) ?? '')
        }
      />
      {/* <Autocomplete
        options={options}
        placeholder={name}
        onChange={(_, option) => handleChange(option)}
        width="220"
        // value={value}
        inputProps={{
          InputProps: {
            // endAdornment: (
            //   <EndAdornment
            //     isLoading={loading}
            //     hasValue={!!value}
            //     onClear={() => handleChange('')}
            //   />
            // ),
          },
        }}
        // renderInput={params => (
        //   <BasicTextInput
        //     InputProps={{
        //       endAdornment: (
        //         <EndAdornment
        //           isLoading={loading}
        //           hasValue={!!value}
        //           onClear={() => handleChange('')}
        //         />
        //       ),
        //       sx: { width: '220px' },
        //     }}
        //     // value={value}
        //     onChange={e => {}}
        //     label={'Test'}
        //     sx={{
        //       '& .MuiInputLabel-root': {
        //         zIndex: 100,
        //         top: '4px',
        //         left: '8px',
        //         color: 'gray.main',
        //       },
        //       '& .MuiInputLabel-root.Mui-focused': {
        //         color: 'secondary.main',
        //       },
        //     }}
        //   />
        // )}
      /> */}
    </>
  );
};
