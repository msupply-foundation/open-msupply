import React from 'react';
import { ControlProps, rankWith, uiTypeIs } from '@jsonforms/core';
import { withJsonFormsControlProps } from '@jsonforms/react';
import { z } from 'zod';
import { useZodOptionsValidation } from '../../common/hooks/useZodOptionsValidation';
import { Typography } from '@openmsupply-client/common';
import { SearchWithUserSource } from './SearchWithUserSource';
import { SearchWithDocumentSource } from './SearchWithDocumentSource';
import { SearchWithPatientContactSource } from './SearchWithPatientContactSource';

/**
 * Specifies the search options when doing a user input type search
 */
const UserOptions = z.object({
  /**
   * Source of the search data -- user input or extract it from document
   */
  source: z.literal('user'),
  /**
   * Pattern for formatting options list items (e.g. "${firstName} ${lastName}")
   */
  optionString: z.string().optional(),
  /**
   * List of fields to save in document data (from selected item object)
   */
  saveFields: z.array(z.string()).optional(),
  /**
   * Child form elements
   */
  elements: z.array(z.any()),
  /**
   * List of fields to match against when searching Patients
   */
  searchFields: z.array(z.string()),
});

/**
 * Specifies the search options when doing a search using a document source
 */
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

const PatientContactOptions = z.object({
  /*
   * Source of the search data -- looks up the first contact from the patient contact list using
   * the matching `category`.
   */
  source: z.literal('patientContact'),

  /**
   * The contact category, e.g. NextOfKin
   */
  category: z.string(),
  displayString: z.string().optional(),
});

const Options = z.discriminatedUnion('source', [
  DocumentOptions,
  UserOptions,
  PatientContactOptions,
]);

export type UserOptions = z.infer<typeof UserOptions>;
export type DocumentOptions = z.infer<typeof DocumentOptions>;
export type PatientContactOptions = z.infer<typeof PatientContactOptions>;

export const searchTester = rankWith(10, uiTypeIs('Search'));

const UIComponent = (props: ControlProps) => {
  const { errors: zErrors, options } = useZodOptionsValidation(
    Options,
    props.uischema.options
  );

  if (zErrors) return <Typography color="error">{zErrors}</Typography>;

  const childProps = { ...props, errors: zErrors || props.errors };

  switch (options?.source) {
    case 'user':
      return <SearchWithUserSource {...childProps} options={options} />;
    case 'document':
      return <SearchWithDocumentSource {...childProps} options={options} />;
    case 'patientContact':
      return (
        <SearchWithPatientContactSource {...childProps} options={options} />
      );
    default:
      return null;
  }
};

export const Search = withJsonFormsControlProps(UIComponent);
