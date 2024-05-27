import React, { FC, useState } from 'react';
import {
  useTranslation,
  DataTable,
  Box,
  DialogButton,
  Typography,
  useDialog,
  TableProvider,
  createTableStore,
  Grid,
  useNotification,
  getErrorMessage,
  noOtherVariants,
  ButtonWithIcon,
  ReportContext,
  LoadingButton,
  PrinterIcon,
  StockLineNode,
} from '@openmsupply-client/common';
import { PlusCircleIcon } from '@common/icons';
import { RepackEditForm } from './RepackEditForm';
import {
  Repack,
  ReportRowFragment,
  ReportSelector,
  useActivityLog,
  useReport,
  useStock,
} from '@openmsupply-client/system';
import { RepackFragment } from '../../api';
import { useRepackColumns } from './column';

interface RepackModalControlProps {
  isOpen: boolean;
  onClose: () => void;
  stockLine: StockLineNode;
}

const useDraftRepack = (seed: Repack) => {
  const [repack, setRepack] = useState<Repack>(() => ({ ...seed }));
  const { mutateAsync, isLoading, isError } = useStock.repack.insert(
    seed.stockLineId ?? ''
  );

  const onChange = (patch: Partial<Repack>) => {
    setRepack({ ...repack, ...patch });
  };

  const onInsert = async () => mutateAsync(repack);

  return {
    onChange,
    onInsert,
    isLoading,
    draft: repack,
    isError,
  };
};

export const RepackModal: FC<RepackModalControlProps> = ({
  isOpen,
  onClose,
  stockLine,
}) => {
  const t = useTranslation('inventory');
  const { error, success } = useNotification();
  const { Modal } = useDialog({ isOpen, onClose });

  const [invoiceId, setInvoiceId] = useState<string | undefined>(undefined);
  const [isNew, setIsNew] = useState<boolean>(false);
  const defaultRepack = {
    stockLineId: stockLine?.id,
    newPackSize: 0,
    numberOfPacks: 0,
  };

  const { data, isError, isLoading } = useStock.repack.list(
    stockLine?.id ?? ''
  );
  const { data: logData } = useActivityLog.document.listByRecord(
    stockLine?.id ?? ''
  );

  const { draft, onChange, onInsert } = useDraftRepack(defaultRepack);
  const { columns } = useRepackColumns();
  // only display the message if there are lines to click on
  // if there are no lines, the 'click new' message is displayed closer to the action
  const displayMessage =
    invoiceId == undefined && !isNew && !!data?.nodes.length;
  const showRepackDetail = invoiceId || isNew;
  const showLogEvent = !!logData?.nodes.length;

  const { print, isPrinting } = useReport.utils.print();

  const printReport = (report: ReportRowFragment) => {
    if (!data) return;
    print({ reportId: report.id, dataId: invoiceId || '' });
  };

  const onRowClick = (rowData: RepackFragment) => {
    onChange(defaultRepack);
    setInvoiceId(rowData.id);
    setIsNew(false);
  };

  const onNewClick = () => {
    onChange(defaultRepack);
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

  return (
    <Modal
      width={900}
      height={700}
      slideAnimation={false}
      title={t('title.repack-details')}
      okButton={
        <DialogButton
          variant="save"
          disabled={!draft?.newPackSize || !draft?.numberOfPacks}
          onClick={async () => {
            try {
              const result = await onInsert();
              const errorMessage = mapStructuredErrors(result);

              if (errorMessage) {
                error(errorMessage)();
              } else {
                onChange(defaultRepack);
                if (stockLine?.totalNumberOfPacks === draft.numberOfPacks) {
                  onClose();
                  success(t('messages.all-packs-repacked'))();
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
          onPrint={printReport}
          disabled={!invoiceId}
        >
          <LoadingButton
            sx={{ marginLeft: 1 }}
            variant="outlined"
            startIcon={<PrinterIcon />}
            isLoading={isPrinting}
            disabled={!invoiceId}
          >
            {t('button.print')}
          </LoadingButton>
        </ReportSelector>
      }
    >
      <Box>
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
              onClick={onNewClick}
            />
          </Box>
        </Box>
        {displayMessage && (
          <Box flex={1} display="flex" alignItems="flex-end">
            <Typography>{t('messages.no-repack-detail')}</Typography>
          </Box>
        )}
        <Box display="flex" flexDirection="column" height={435}>
          <Box display="flex" flexDirection="column" flex={1}>
            <Box sx={{ maxHeight: 260, overflowY: 'auto' }}>
              <TableProvider createStore={createTableStore}>
                <DataTable
                  id="repack-list"
                  columns={columns}
                  data={data?.nodes}
                  isLoading={isLoading}
                  isError={isError}
                  noDataMessage={t('messages.no-repacks')}
                  overflowX="auto"
                  onRowClick={onRowClick}
                />
              </TableProvider>
            </Box>
          </Box>
          <Box paddingLeft={3} paddingTop={3} flex={1}>
            {showRepackDetail && (
              <RepackEditForm
                invoiceId={invoiceId}
                onChange={onChange}
                stockLine={stockLine}
                draft={draft}
              />
            )}
          </Box>
        </Box>
      </Box>
    </Modal>
  );
};
