import React, { FC } from 'react';
import {
  Autocomplete,
  AutocompleteOptionRenderer,
  Box,
  DefaultAutocompleteItemOption,
  DocumentRegistryCategoryNode,
  Typography,
  useBufferState,
} from '@openmsupply-client/common';
import {
  useDocumentRegistry,
  DocumentRegistryFragment,
} from '@openmsupply-client/programs';

interface ContactTraceSearchInputProps {
  onChange: (type: DocumentRegistryFragment) => void;
  width?: number;
  value: DocumentRegistryFragment | null;
  disabled?: boolean;
}

const getContactTraceOptionRenderer =
  (): AutocompleteOptionRenderer<DocumentRegistryFragment> => (props, node) => {
    const name = node.name ?? '';

    return (
      <DefaultAutocompleteItemOption {...props} key={props.id}>
        <Box display="flex" alignItems="flex-end" gap={1} height={25}>
          <Typography>{name}</Typography>
        </Box>
      </DefaultAutocompleteItemOption>
    );
  };

export const ContactTraceSearchInput: FC<ContactTraceSearchInputProps> = ({
  onChange,
  width = 250,
  value,
  disabled = false,
}) => {
  const { data, isLoading } = useDocumentRegistry.get.documentRegistries({
    filter: {
      category: {
        equalTo: DocumentRegistryCategoryNode.ContactTrace,
      },
    },
  });
  const [buffer, setBuffer] = useBufferState(value);
  const OptionRenderer = getContactTraceOptionRenderer();

  return (
    <Autocomplete
      disabled={disabled}
      clearable={false}
      value={
        buffer && {
          ...buffer,
          label: buffer.name ?? '',
        }
      }
      loading={isLoading}
      onChange={(_, name) => {
        setBuffer(name);
        name && onChange(name);
      }}
      options={data?.nodes ?? []}
      renderOption={OptionRenderer}
      width={`${width}px`}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option.id === value.id}
    />
  );
};
