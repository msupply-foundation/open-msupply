import React, { useEffect } from 'react';
import {
  DetailViewSkeleton,
  AlertModal,
  RouteBuilder,
  useNavigate,
  useTranslation,
  useBreadcrumbs,
  useParams,
  useNonPaginatedMaterialTable,
  NothingHere,
  MaterialTable,
  useEditModal,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { Toolbar } from './Toolbar';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { StockMovementLineFragment, useStockMovement } from '../api';
import { useStockMovementColumns } from './columns';
import { Footer } from './Footer';
import { StockMovementLineEdit } from './LineEdit';
import { isStockMovementDisabled } from '../utils';

export const DetailView = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { id = '' } = useParams();
  const { setCustomBreadcrumbs } = useBreadcrumbs();

  const { data, isLoading } = useStockMovement(id);
  const lines = data?.lines.nodes ?? [];
  const isDisabled = !data || isStockMovementDisabled(data.status);

  const { isOpen, entity, onOpen, onClose, mode } =
    useEditModal<StockMovementLineFragment>();

  useEffect(() => {
    setCustomBreadcrumbs({
      1: data ? String(data.stockMovementNumber) : '',
    });
  }, [setCustomBreadcrumbs, data]);

  const columns = useStockMovementColumns();

  const { table, selectedRows } =
    useNonPaginatedMaterialTable<StockMovementLineFragment>({
    tableId: 'stock-movement-detail',
    columns,
    isLoading,
    data: lines,
    onRowClick: isDisabled ? undefined : row => onOpen(row),
    grouping: { field: 'stockLine.item.code' },
    initialSort: { key: 'stockLine.item.name', dir: 'asc' },
    noDataElement: (
      <NothingHere
        body={t('messages.no-stock-movement-lines')}
        onCreate={isDisabled ? undefined : () => onOpen()}
        buttonText={t('button.add-line')}
      />
    ),
  });

  if (isLoading) return <DetailViewSkeleton hasGroupBy={true} />;

  if (!data)
    return (
      <AlertModal
        open={true}
        onOk={() =>
          navigate(
            RouteBuilder.create(AppRoute.Inventory)
              .addPart(AppRoute.StockMovement)
              .build()
          )
        }
        title={t('error.stock-movement-not-found')}
        message={t('messages.click-to-return')}
      />
    );

  return (
    <>
      <AppBarButtons movement={data} onAddLine={() => onOpen()} />
      <SidePanel movement={data} />
      <Toolbar movement={data} />
      <MaterialTable table={table} />
      <Footer
        movement={data}
        selectedRows={selectedRows}
        resetRowSelection={table.resetRowSelection}
      />
      {isOpen && (
        <StockMovementLineEdit
          movement={data}
          line={entity}
          mode={mode}
          isOpen={isOpen}
          onClose={onClose}
        />
      )}
    </>
  );
};
