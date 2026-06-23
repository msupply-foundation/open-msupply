import React, { useEffect } from 'react';
import {
  Box,
  Typography,
  BasicSpinner,
  NothingHere,
  DetailContainer,
  useTranslation,
  useParams,
  useBreadcrumbs,
  useNotification,
  PropertyDisplayModeV2Input,
} from '@openmsupply-client/common';
import { useProperty, useSetPropertyDisplayMode } from '../api';
import { PROPERTY_SCOPES, formatValueType } from '../utils';
import { ScopeRow } from './ScopeRow';

export const PropertiesDetailView = () => {
  const t = useTranslation();
  const { id } = useParams();
  const { property, isLoading } = useProperty(id);
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const { error } = useNotification();
  const { mutateAsync, isPending } = useSetPropertyDisplayMode();

  useEffect(() => {
    if (property) setCustomBreadcrumbs({ 1: property.name });
  }, [property, setCustomBreadcrumbs]);

  if (isLoading) return <BasicSpinner />;
  if (!property) return <NothingHere body={t('error.no-properties')} />;

  const modeByScope = new Map(
    property.scopes.map(scope => [scope.tableName, scope.displayMode])
  );

  const handleChange =
    (tableName: string) =>
    async (displayMode: PropertyDisplayModeV2Input | null) => {
      try {
        await mutateAsync({ propertyId: property.id, tableName, displayMode });
      } catch {
        error(t('error.something-wrong'))();
      }
    };

  return (
    <DetailContainer>
      <Box
        display="flex"
        flexDirection="column"
        gap={2}
        width={600}
        maxWidth="100%"
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>
            {property.name}
          </Typography>
          <Typography color="textSecondary">
            {formatValueType(property.valueType)}
          </Typography>
        </Box>

        <Typography fontWeight={700} sx={{ marginTop: 1 }}>
          {t('heading.where-this-appears')}
        </Typography>

        {PROPERTY_SCOPES.map(scope => (
          <ScopeRow
            key={scope.tableName}
            scope={scope}
            mode={modeByScope.get(scope.tableName)}
            disabled={isPending}
            onChange={handleChange(scope.tableName)}
          />
        ))}
      </Box>
    </DetailContainer>
  );
};
