import React from 'react';
import {
  DetailContainer,
  Grid,
  NothingHere,
  useTranslation,
} from '@openmsupply-client/common';
import { useName } from '../api';
import { NameCustomFields } from '../Details/NameCustomFields';

interface CustomFieldsTabProps {
  /** The `name.customFields` blob from the Name node, keyed by property `key`. */
  properties?: Record<string, unknown> | null;
}

/**
 * Read-only "Properties" tab for a name's `customFields`. Shows every configured
 * property (unset ones render blank) via the shared {@link NameCustomFields} /
 * {@link CustomFieldDetailRows}, so the UX matches item/patient; only falls back
 * to the empty state when no property definitions exist at all. Editing is a
 * later stage.
 */
export const CustomFieldsTab = ({ properties }: CustomFieldsTabProps) => {
  const t = useTranslation();
  const { data: definitions } = useName.document.customFields('supplier');

  if (!definitions?.length) {
    return <NothingHere body={t('messages.no-custom-fields')} />;
  }

  return (
    <DetailContainer>
      <Grid
        container
        flex={1}
        flexDirection="column"
        style={{ maxWidth: 500 }}
        gap={4}
      >
        <NameCustomFields properties={properties} scope="supplier" />
      </Grid>
    </DetailContainer>
  );
};
