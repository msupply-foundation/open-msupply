import React, { FC, useState } from 'react';
import {
  useTranslation,
  DialogButton,
  Typography,
  useDialog,
  Grid,
  useNotification,
  getErrorMessage,
  noOtherVariants,
  ReportContext,
  LoadingButton,
  PrinterIcon,
  ModalTabs,
} from '@openmsupply-client/common';
import {
  LogList,
  Repack,
  ReportRowFragment,
  ReportSelector,
  useReport,
  useStock,
} from '@openmsupply-client/system';
import { RepackForm } from './RepackForm';
import { StockLineRowFragment } from '../../api';

interface RepackModalControlProps {
  isOpen: boolean;
  onClose: () => void;
  stockLine: StockLineRowFragment | null;
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

export const defaultRepack = (stockLineId?: string): Repack => ({
  stockLineId: stockLineId ?? '',
  newPackSize: 0,
  numberOfPacks: 0,
});

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

  const { draft, onChange, onInsert } = useDraftRepack(
    defaultRepack(stockLine?.id)
  );

  const { print, isPrinting } = useReport.utils.print();

  const printReport = (report: ReportRowFragment) => {
    if (!invoiceId) return;
    print({ reportId: report.id, dataId: invoiceId || '' });
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

  const tabs = [
    {
      Component: (
        <RepackForm
          draft={draft}
          stockLine={stockLine}
          setInvoiceId={setInvoiceId}
          invoiceId={invoiceId}
          onChange={onChange}
          setIsNew={setIsNew}
          isNew={isNew}
        />
      ),
      value: 'label.details',
    },
    {
      Component: (
        <LogList
          recordId={stockLine?.id ?? ''}
          eventInfo={t('messages.repack-log-info')}
        />
      ),
      value: 'label.log',
    },
  ];

  return (
    <Modal
      width={900}
      height={700}
      slideAnimation={false}
      title={t('title.repack-details')}
      okButton={
        <DialogButton
          variant="save"
          disabled={draft?.newPackSize === 0 || draft?.numberOfPacks === 0}
          onClick={async () => {
            try {
              const result = await onInsert();
              const errorMessage = mapStructuredErrors(result);

              if (errorMessage) {
                error(errorMessage)();
              } else {
                onChange(defaultRepack(stockLine?.id));
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
      <Grid container alignItems="center" flexDirection="column">
        <Typography sx={{ fontWeight: 'bold' }} variant="h6">
          {stockLine?.item.name}
        </Typography>
        <Typography sx={{ fontWeight: 'bold', marginBottom: 3 }}>
          {`${t('label.code')} : ${stockLine?.item.code}`}
        </Typography>
        <ModalTabs tabs={tabs} />
      </Grid>
    </Modal>
  );
};
