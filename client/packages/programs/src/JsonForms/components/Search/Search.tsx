import React from 'react';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { z } from 'zod';
import { useZodOptionsValidation } from '../../common/hooks/useZodOptionsValidation';
import { SearchWithUserSource } from './SearchWithUserSource';
import { SearchWithDocumentSource } from './SearchWithDocumentSource';
import { QueryValues } from './useSearchQueries';

const UserOptions = z.object({
  /**
   * Source of the search data -- user input or extract it from document
   */
  source: z.literal('user'),
  /**
   * Which pre-defined query to use (in useSearchQueries)
   */
  query: z.enum(QueryValues),
  /**
   * Pattern for formatting options list items (e.g. "${firstName} ${lastName}")
   */
  optionString: z.string().optional(),
  /**
   * Pattern for formatting selected result (as above)
   */
  displayString: z.string().optional(),
  /**
   * List of fields to save in document data (from selected item object)
   */
  saveFields: z.array(z.string()).optional(),
  /**
   * Text to show in input field before user entry
   */
  placeholderText: z.string().optional(),
});

const DocumentOptions = z.object({
  source: z.literal('document'),
  /**
   * Source document type. Either the current patient or the current encounter (if applicable).
   */
  document: z.enum(['patient', 'encounter']),
  /**
   * Path in the specified document to extract
   */
  path: z.string(),
  displayString: z.string().optional(),
  saveFields: z.array(z.string()).optional(),
});

const Options = z.discriminatedUnion('source', [DocumentOptions, UserOptions]);

export type UserOptions = z.infer<typeof UserOptions>;
export type DocumentOptions = z.infer<typeof DocumentOptions>;

export const searchTester = rankWith(10, uiTypeIs('Search'));

const UIComponent = (props: ControlProps) => {
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    props.uischema.options
  );

  const childProps = { ...props, errors: props.errors ?? zErrors };

  switch (options?.source) {
    case 'user':
      return <SearchWithUserSource {...childProps} options={options} />;
    case 'document':
      return <SearchWithDocumentSource {...childProps} options={options} />;
    default:
      return null;
  }
};

export const Search = withJsonFormsControlProps(UIComponent);
