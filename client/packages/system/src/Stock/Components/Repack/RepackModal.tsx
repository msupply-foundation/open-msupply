import React, { FC, useState } from 'react';
import {
  useTranslation,
  Box,
  DialogButton,
  Typography,
  useDialog,
  Grid,
  useNotification,
  getErrorMessage,
  noOtherVariants,
  ButtonWithIcon,
  ReportContext,
  useConfirmationModal,
  useNavigate,
  RouteBuilder,
  useCallbackWithPermission,
  UserPermission,
  PlusCircleIcon,
  MaterialTable,
  useSimpleMaterialTable,
  NothingHere,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { RepackEditForm } from './RepackEditForm';
import { ReportSelector, useActivityLog } from '@openmsupply-client/system';
import { RepackFragment, StockLineRowFragment } from '../../api';
import { useRepackColumns } from './column';
import { useRepack } from '../../api/hooks';

interface RepackModalControlProps {
  isOpen: boolean;
  onClose: () => void;
  stockLine: StockLineRowFragment;
}

export const RepackModal: FC<RepackModalControlProps> = ({
  isOpen,
  onClose,
  stockLine,
}) => {
  const t = useTranslation();
  const { error, success } = useNotification();
  const getRedirectConfirmation = useConfirmationModal({
    title: t('title.repack-complete'),
    message: t('messages.all-packs-repacked'),
  });
  const navigate = useNavigate();
  const { Modal } = useDialog({ isOpen, onClose });

  const [invoiceId, setInvoiceId] = useState<string | undefined>(undefined);
  const [isNew, setIsNew] = useState<boolean>(false);

  const { data: logData } = useActivityLog(stockLine?.id ?? '');

  const {
    list: { repacks, isError, isLoading },
    repack: { repackData },
    draft,
    onChange,
    onInsert: { mutateAsync: onInsert, isLoading: isInserting },
  } = useRepack({ stockLineId: stockLine?.id, invoiceId });

  // only display the message if there are lines to click on
  // if there are no lines, the 'click new' message is displayed closer to the action
  const displayMessage = invoiceId == undefined && !isNew && !!repacks?.length;
  const showRepackDetail = invoiceId || isNew;
  const showLogEvent = !!logData?.nodes.length;

  const onRowClick = (rowData: RepackFragment) => {
    setInvoiceId(rowData.id);
    setIsNew(false);
  };

  const onNewClick = () => {
    setInvoiceId(undefined);
    setIsNew(true);
  };

  const mapStructuredErrors = (
    result: Awaited<ReturnType<typeof onInsert>>
  ): string | undefined => {
    if (result.__typename === 'InvoiceNode') {
      return undefined;
    }

    const { error: repackError } = result;

    switch (repackError.__typename) {
      case 'StockLineReducedBelowZero':
        return t('error.repack-has-stock-reduced-below-zero');
      case 'CannotHaveFractionalPack':
        return t('error.repack-cannot-be-fractional');
      default:
        noOtherVariants(repackError);
    }
  };

  const getFormData = () => {
    const isNewRepack = !repackData;
    if (isNewRepack) {
      return {
        ...draft,
        locationName: stockLine.location?.name,
        packSize: stockLine.packSize,
        restrictedToLocationType:
          stockLine.item.restrictedLocationTypeId ?? undefined,
      };
    }

    const { numberOfPacks, packSize, location: fromLocation } = repackData.from;
    const { packSize: newPackSize, location: toLocation } = repackData.to;
    return {
      stockLineId: stockLine.id,
      numberOfPacks,
      packSize,
      newPackSize,
      locationName: fromLocation?.name,
      newLocationId: toLocation?.id,
      newLocationName: toLocation?.name,
    };
  };

  const newRepack = useCallbackWithPermission(
    UserPermission.CreateRepack,
    onNewClick
  );

  const columns = useRepackColumns();

  const table = useSimpleMaterialTable<RepackFragment>({
    tableId: 'repack-list',
    columns,
    isLoading,
    isError,
    data: repacks,
    onRowClick,
    noDataElement: <NothingHere
      body={t('messages.no-repacks')}
      onCreate={newRepack}
    />,
  });

  return (
    <Modal
      width={900}
      height={700}
      slideAnimation={false}
      title={t('title.repack-details')}
      okButton={
        <DialogButton
          variant="save"
          disabled={!draft?.newPackSize || !draft?.numberOfPacks || isInserting}
          onClick={async () => {
            try {
              const result = await onInsert();
              const errorMessage = mapStructuredErrors(result);

              // The new stockline is the first of two lines in the resulting
              // invoice
              const newLineId =
                result.__typename === 'InvoiceNode'
                  ? (result?.lines?.nodes?.[0]?.stockLine?.id ?? '')
                  : '';

              if (errorMessage) {
                error(errorMessage)();
              } else {
                if (stockLine?.totalNumberOfPacks === draft.numberOfPacks) {
                  onClose();
                  getRedirectConfirmation({
                    onConfirm: () =>
                      navigate(
                        RouteBuilder.create(AppRoute.Inventory)
                          .addPart(AppRoute.Stock)
                          .addPart(newLineId)
                          .build()
                      ),
                  });
                } else {
                  success(t('messages.saved'))();
                }
                // reset the 'new' state and hide the form
                setInvoiceId(undefined);
                setIsNew(false);
              }
            } catch (e) {
              error(getErrorMessage(e))();
            }
          }}
        />
      }
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      reportSelector={
        <ReportSelector
          context={ReportContext.Repack}
          dataId={invoiceId || ''}
        />
      }
    >
      <>
        <Grid container alignItems="center" flexDirection="column">
          <Typography sx={{ fontWeight: 'bold' }} variant="h6">
            {stockLine?.item.name}
          </Typography>
          <Typography sx={{ fontWeight: 'bold' }}>
            {`${t('label.code')} : ${stockLine?.item.code}`}
          </Typography>
          {showLogEvent && (
            <Typography sx={{ fontWeight: 'bold', marginBottom: 3 }}>
              {`${t('messages.repack-log-info')} : ${logData?.nodes[0]?.to}`}
            </Typography>
          )}
        </Grid>
        <Box
          display="flex"
          justifyContent="flex-end"
          paddingBottom={1}
          marginTop={-3}
        >
          <Box flex={0}>
            <ButtonWithIcon
              label={t('label.new')}
              Icon={<PlusCircleIcon />}
              onClick={newRepack}
            />
          </Box>
        </Box>
        {displayMessage && (
          <Box flex={1} display="flex" alignItems="flex-end">
            <Typography>{t('messages.no-repack-detail')}</Typography>
          </Box>
        )}
        <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
          <MaterialTable table={table} />
        </Box>
        <Box paddingLeft={3} paddingTop={3} flex={1}>
          {showRepackDetail && (
            <RepackEditForm
              onChange={onChange}
              availableNumberOfPacks={stockLine.availableNumberOfPacks}
              data={getFormData()}
              isNew={isNew}
            />
          )}
        </Box>
      </>
    </Modal>
  );
};
