import React from 'react';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { z } from 'zod';
import { useZodOptionsValidation } from '../../common/hooks/useZodOptionsValidation';
import { SearchWithUserSource } from './SearchWithUserSource';

const Options = z.object({
  /**
   * Source of the search data -- user input or extract it from document
   */
  source: z.enum(['user', 'document']),
});

type Options = z.infer<typeof Options>;

export const searchTester = rankWith(10, uiTypeIs('Search'));

const UIComponent = (props: ControlProps) => {
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    props.uischema.options
  );

  const childProps = { ...props, errors: props.errors ?? zErrors };

  switch (options?.source) {
    case 'user':
      return <SearchWithUserSource {...childProps} />;
    // case 'document':
    //   return <SearchWithDocumentSource {...props} />;
    default:
      return <p>Other</p>;
  }
};

export const Search = withJsonFormsControlProps(UIComponent);
