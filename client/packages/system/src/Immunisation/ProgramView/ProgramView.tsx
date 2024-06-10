import React, { FC, useEffect } from 'react';
import {
  TableProvider,
  createTableStore,
  useBreadcrumbs,
  createQueryParamsStore,
  useParams,
  Typography,
  InlineSpinner,
  AppFooterPortal,
  Box,
  ButtonWithIcon,
  CloseIcon,
  LoadingButton,
  SaveIcon,
  useTranslation,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { useImmunisationProgram } from '../api/hooks/useImmunisationProgram';

export const ProgramComponent: FC = () => {
  const t = useTranslation('system');
  const { setSuffix, navigateUpOne } = useBreadcrumbs();
  const { id } = useParams();
  const {
    query: { data, isLoading },
    draft,
    updatePatch,
    isDirty,
    update: { update, isUpdating },
  } = useImmunisationProgram(id);

  useEffect(() => {
    setSuffix(data?.name ?? '');
  }, [setSuffix, data]);

  return isLoading ? (
    <InlineSpinner />
  ) : (
    <>
      <Toolbar draft={draft} onUpdate={updatePatch} />
      <Typography variant="body2">Vaccine Course List - Coming soon</Typography>
      <AppFooterPortal
        Content={
          <Box
            gap={2}
            display="flex"
            flexDirection="row"
            alignItems="center"
            height={64}
          >
            <Box flex={1} display="flex" justifyContent="flex-end" gap={2}>
              <ButtonWithIcon
                shrinkThreshold="lg"
                Icon={<CloseIcon />}
                label={t('button.close')}
                color="secondary"
                sx={{ fontSize: '12px' }}
                onClick={navigateUpOne}
              />

              <LoadingButton
                disabled={!isDirty || isUpdating}
                isLoading={isUpdating}
                onClick={() => {
                  update();
                }}
                startIcon={<SaveIcon />}
                sx={{ fontSize: '12px' }}
              >
                {t('button.save')}
              </LoadingButton>
            </Box>
          </Box>
        }
      />
    </>
  );
};

export const ProgramView: FC = () => (
  <TableProvider
    createStore={createTableStore}
    queryParamsStore={createQueryParamsStore({
      initialSortBy: { key: 'name' },
    })}
  >
    <ProgramComponent />
  </TableProvider>
);
