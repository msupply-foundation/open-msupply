import React, { FC, useCallback } from 'react';
import {
  TableProvider,
  createTableStore,
  DetailViewSkeleton,
  useNavigate,
  useTranslation,
  AlertModal,
  RouteBuilder,
  useEditModal,
  createQueryParamsStore,
  DetailTabs,
  BasicModal,
  Box,
  FnUtils,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import {
  ActivityLogList,
  ItemRowFragment,
  StockItemSearchInput,
} from '@openmsupply-client/system';
import { Toolbar } from './Toolbar/Toolbar';
import { Footer } from './Footer';
import { AppBarButtons } from './AppBarButtons';
import { SidePanel } from './SidePanel';
import { ContentArea } from './ContentArea';
import { useResponse, ResponseLineFragment } from '../api';

export const DetailView: FC = () => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { data, isLoading } = useResponse.document.get();
  const isDisabled = useResponse.utils.isDisabled();
  const { onOpen, isOpen, onClose } = useEditModal<ItemRowFragment>();
  const { mutateAsync } = useResponse.line.insert();

  const onRowClick = useCallback((line: ResponseLineFragment) => {
    navigate(
      RouteBuilder.create(AppRoute.Distribution)
        .addPart(AppRoute.CustomerRequisition)
        .addPart(String(line.requisitionNumber))
        .addPart(String(line.item.id))
        .build(),
      { replace: true }
    );
  }, []);

  if (isLoading) return <DetailViewSkeleton />;

  const tabs = [
    {
      Component: (
        <ContentArea
          onAddItem={() => onOpen(null)}
          onRowClick={!isDisabled ? onRowClick : null}
          disableAddLine={
            isDisabled || !!data?.linkedRequisition || !!data?.programName
          }
        />
      ),
      value: 'Details',
    },
    {
      Component: <ActivityLogList recordId={data?.id ?? ''} />,
      value: 'Log',
    },
  ];

  return !!data ? (
    <TableProvider
      createStore={createTableStore}
      queryParamsStore={createQueryParamsStore<ResponseLineFragment>({
        initialSortBy: { key: 'itemName' },
      })}
    >
      <AppBarButtons
        isDisabled={isDisabled}
        hasLinkedRequisition={!!data.linkedRequisition}
        isProgram={!!data.programName}
        onAddItem={() => onOpen(null)}
      />
      <Toolbar />
      <DetailTabs tabs={tabs} />

      <Footer />
      <SidePanel />
      {isOpen && (
        <BasicModal open={isOpen} onClose={onClose} height={500} width={800}>
          <Box padding={2}>
            <StockItemSearchInput
              onChange={(newItem: ItemRowFragment | null) => {
                if (newItem) {
                  mutateAsync({
                    id: FnUtils.generateUUID(),
                    requisitionId: data.id,
                    itemId: newItem.id,
                  });
                  navigate(
                    RouteBuilder.create(AppRoute.Distribution)
                      .addPart(AppRoute.CustomerRequisition)
                      .addPart(String(data.requisitionNumber))
                      .addPart(String(newItem.id))
                      .build(),
                    { replace: true }
                  );
                }
              }}
              openOnFocus={true}
              extraFilter={item =>
                !data.lines.nodes.some(line => line.item.id === item.id)
              }
            />
          </Box>
        </BasicModal>
      )}
    </TableProvider>
  ) : (
    <AlertModal
      open={true}
      onOk={() =>
        navigate(
          RouteBuilder.create(AppRoute.Distribution)
            .addPart(AppRoute.CustomerRequisition)
            .build()
        )
      }
      title={t('error.requisition-not-found')}
      message={t('messages.click-to-return-to-requisitions')}
    />
  );
};
