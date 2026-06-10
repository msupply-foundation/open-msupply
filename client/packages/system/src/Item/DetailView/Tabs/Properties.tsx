import React from 'react';
import {
  DetailContainer,
  Grid,
  NothingHere,
  useTranslation,
} from '@openmsupply-client/common';
import { ItemFragment, useItemPropertiesV2 } from '../../api';
import { ItemPropertiesV2 } from '../ItemPropertiesV2';

interface PropertiesTabProps {
  item: ItemFragment;
}

export const PropertiesTab = ({ item }: PropertiesTabProps) => {
  const t = useTranslation();
  const { data: definitions } = useItemPropertiesV2();

  // Show every configured property (unset ones render blank); only fall back to
  // the empty state when no property definitions exist at all.
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
        <ItemPropertiesV2 properties={item?.propertiesV2} />
      </Grid>
    </DetailContainer>
  );
};
