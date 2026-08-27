import React from 'react';
import {
  DetailContainer,
  Grid,
  NothingHere,
  useTranslation,
} from '@openmsupply-client/common';
import { ItemFragment, useItemCustomFields } from '../../api';
import { ItemCustomFields } from '../ItemCustomFields';

interface CustomFieldsTabProps {
  item: ItemFragment;
}

export const CustomFieldsTab = ({ item }: CustomFieldsTabProps) => {
  const t = useTranslation();
  const { data: definitions } = useItemCustomFields();

  // Show every configured property (unset ones render blank); only fall back to
  // the empty state when no property definitions exist at all.
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
        <ItemCustomFields properties={item?.customFields} />
      </Grid>
    </DetailContainer>
  );
};
