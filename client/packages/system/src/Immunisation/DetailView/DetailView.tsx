import React, { FC, useEffect } from 'react';
import {
  TableProvider,
  createTableStore,
  AlertModal,
  RouteBuilder,
  useNavigate,
  useTranslation,
  useBreadcrumbs,
} from '@openmsupply-client/common';
import { Toolbar } from './Toolbar';
import { AppRoute } from '@openmsupply-client/config';

export const ImmunisationDetailView: FC = () => {
  const navigate = useNavigate();
  const t = useTranslation('catalogue');
  const { setSuffix } = useBreadcrumbs();

  const data = {
    name: 'data',
  };

  useEffect(() => {
    setSuffix(data?.name ?? '');
  }, [data]);

  return !!data ? (
    <TableProvider createStore={createTableStore}>
      <Toolbar />
    </TableProvider>
  ) : (
    <AlertModal
      open={true}
      onOk={() =>
        navigate(
          RouteBuilder.create(AppRoute.Catalogue)
            .addPart(AppRoute.Immunisations)
            .build()
        )
      }
      title={t('error.immunisations-not-found')}
      message={t('messages.click-to-return-to-master-lists')}
    />
  );
};
