import React from 'react';
import {
  DetailContainer,
  Grid,
  NothingHere,
  useTranslation,
} from '@openmsupply-client/common';
import { useName } from '../api';
import { NamePropertiesV2 } from '../Details/NamePropertiesV2';

interface PropertiesTabProps {
  /** The `name.propertiesV2` blob from the Name node, keyed by property `key`. */
  properties?: Record<string, unknown> | null;
}

/**
 * Read-only "Properties" tab for a name's `propertiesV2`. Shows every configured
 * property (unset ones render blank) via the shared {@link NamePropertiesV2} /
 * {@link PropertyV2DetailRows}, so the UX matches item/patient; only falls back
 * to the empty state when no property definitions exist at all. Editing is a
 * later stage.
 */
export const PropertiesTab = ({ properties }: PropertiesTabProps) => {
  const t = useTranslation();
  const { data: definitions } = useName.document.propertiesV2();

  if (!definitions?.length) {
    return <NothingHere body={t('messages.no-properties')} />;
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
        <NamePropertiesV2 properties={properties} />
      </Grid>
    </DetailContainer>
  );
};
