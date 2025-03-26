import React, { FC, useEffect, useState } from 'react';
import {
  Autocomplete,
  AutocompleteOptionRenderer,
  Box,
  DefaultAutocompleteItemOption,
  DocumentRegistryCategoryNode,
  Typography,
  useTranslation,
} from '@openmsupply-client/common';
import {
  useDocumentRegistry,
  DocumentRegistryFragment,
} from '@openmsupply-client/programs';

interface ContactTraceSearchInputProps {
  onChange: (type: DocumentRegistryFragment) => void;
  width?: number;
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
  disabled = false,
}) => {
  const t = useTranslation();
  const { data, isLoading } = useDocumentRegistry.get.documentRegistries({
    filter: {
      category: {
        equalTo: DocumentRegistryCategoryNode.ContactTrace,
      },
    },
  });
  const [registry, setRegistry] = useState<
    DocumentRegistryFragment | undefined
  >();

  useEffect(() => {
    if (!isLoading && data && data?.nodes.length === 1) {
      const defaultRegistry = data?.nodes[0];
      setRegistry(defaultRegistry);
      defaultRegistry && onChange(defaultRegistry);
    }
  }, [data, isLoading]);
  const OptionRenderer = getContactTraceOptionRenderer();

  return (
    <Autocomplete
      disabled={disabled}
      clearable={false}
      value={
        (registry && {
          ...registry,
          label: registry.name ?? '',
        }) ??
        null
      }
      loading={isLoading}
      onChange={(_, entry) => {
        setRegistry(entry ?? undefined);
        entry && onChange(entry);
      }}
      options={data?.nodes ?? []}
      renderOption={OptionRenderer}
      width={`${width}px`}
      popperMinWidth={width}
      isOptionEqualToValue={(option, value) => option.id === value.id}
      noOptionsText={t('label.no-options')}
    />
  );
};
