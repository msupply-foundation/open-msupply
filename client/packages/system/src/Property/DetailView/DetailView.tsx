import React, { useEffect } from 'react';
import {
  BasicSpinner,
  DetailContainer,
  Grid,
  Navigate,
  PropertyV2TypeEnum,
  RouteBuilder,
  useAuthContext,
  useBreadcrumbs,
  useIsCentralServerApi,
  useNavigate,
  useNotification,
  useParams,
  useTranslation,
  UserPermission,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { useConfigureProperty, useProperty } from '../api';
import { PropertyForm } from './PropertyForm';
import { OptionsEditor } from './OptionsEditor';
import { Footer } from './Footer';
import { useDraftProperty } from './useDraftProperty';
import { useDraftPropertyOptions } from './useDraftPropertyOptions';

export const PropertyDetailView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { error, success } = useNotification();
  const { id } = useParams<{ id: string }>();
  const isNew = id === 'new';
  const isCentralServer = useIsCentralServerApi();
  const { userHasPermission } = useAuthContext();
  const canEditCentral = userHasPermission(UserPermission.EditCentralData);
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const { data: property, isLoading } = useProperty(
    isCentralServer && canEditCentral ? (isNew ? undefined : id) : undefined
  );
  const { mutateAsync, isPending: isSaving } = useConfigureProperty();

  const { draft, update, toggleAttachedTable, isDirty } =
    useDraftProperty(property);
  const optionsDraft = useDraftPropertyOptions(property?.options);

  useEffect(() => {
    setCustomBreadcrumbs({ 1: isNew ? t('label.new-property') : draft.name });
  }, [draft.name, isNew, setCustomBreadcrumbs, t]);

  if (!isCentralServer || !canEditCentral) {
    return (
      <Navigate to={RouteBuilder.create(AppRoute.Manage).build()} replace />
    );
  }

  if (!isNew && isLoading) return <BasicSpinner />;

  const onSave = async () => {
    try {
      const sendOptions =
        draft.type === PropertyV2TypeEnum.Option
          ? optionsDraft.rows
              .filter(o => !o.isDeleted)
              .map(o => ({
                id: o.id,
                name: o.name,
                translationKey: o.translationKey,
              }))
          : [];

      await mutateAsync({
        id: draft.id,
        type: draft.type,
        name: draft.name,
        translationKey: draft.translationKey,
        attachedTo: draft.attachedTables.map(table => ({
          id: draft.attachmentIds[table] ?? draft.id,
          table,
        })),
        options: sendOptions,
      });
      success(t('messages.saved'))();
      if (isNew) navigate(`../${draft.id}`);
    } catch (e) {
      error(t('error.saving-property'))();
    }
  };

  return (
    <>
      <DetailContainer>
        <Grid
          flex={1}
          container
          flexDirection="column"
          gap={3}
          paddingTop={2}
          width="100%"
          flexWrap="nowrap"
          maxWidth={720}
        >
          <PropertyForm
            draft={draft}
            update={update}
            toggleAttachedTable={toggleAttachedTable}
          />
          {draft.type === PropertyV2TypeEnum.Option && (
            <OptionsEditor {...optionsDraft} />
          )}
        </Grid>
      </DetailContainer>
      <Footer
        isSaving={isSaving}
        isDirty={isDirty}
        disabled={!draft.name.trim()}
        onSave={onSave}
      />
    </>
  );
};
