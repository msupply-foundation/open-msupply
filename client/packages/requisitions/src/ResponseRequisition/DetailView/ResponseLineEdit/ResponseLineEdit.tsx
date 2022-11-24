import React from 'react';
import {
  useDialog,
  DialogButton,
  BasicSpinner,
  useBufferState,
  ModalTabs,
} from '@openmsupply-client/common';
import { ResponseLineEditForm } from './ResponseLineEditForm';
import { useResponse, ResponseLineFragment } from '../../api';
import { useDraftRequisitionLine, useNextResponseLine } from './hooks';
import { RequestStoreStats } from '../ReponseStats/RequestStoreStats';
import { ResponseStoreStats } from '../ReponseStats/ResponseStoreStats';

interface ResponseLineEditProps {
  isOpen: boolean;
  onClose: () => void;
  line: ResponseLineFragment;
}

export const ResponseLineEdit = ({
  isOpen,
  onClose,
  line,
}: ResponseLineEditProps) => {
  const [currentLine, setCurrentLine] = useBufferState(line);
  const isDisabled = useResponse.utils.isDisabled();
  const { Modal } = useDialog({ onClose, isOpen });
  const { draft, isLoading, save, update } =
    useDraftRequisitionLine(currentLine);
  const { next, hasNext } = useNextResponseLine(currentLine);
  const { data } = useResponse.line.stats(draft?.id);

  const tabs = [
    {
      Component: <ResponseStoreStats
        stockOnHand={data?.responseStoreStats.stockOnHand || 0}
        incomingStock={data?.responseStoreStats.incomingStock || 0}
        stockOnOrder={data?.responseStoreStats.stockOnOrder || 0}
        requestedQuantity={data?.responseStoreStats.requestedQuantity || 0}
        otherRequestedQuantity={data?.responseStoreStats.otherRequestedQuantity || 0}
      />,
      value: 'My Store',
    },
    {
      Component: <RequestStoreStats 
        maxMonthsOfStock={data?.requestStoreStats.maxMonthsOfStock || 0}
        suggestedQuantity={data?.requestStoreStats.suggestedQuantity || 0}
        availableStockOnHand={data?.requestStoreStats.stockOnHand || 0}
        averageMonthlyConsumption={data?.requestStoreStats.averageMonthlyConsumption || 0}
      />,
      value: 'Customer',
    },
  ];

  return (
    <Modal
      title={''}
      contentProps={{ sx: { padding: 0 } }}
      cancelButton={<DialogButton variant="cancel" onClick={onClose} />}
      nextButton={
        <DialogButton
          disabled={!hasNext}
          variant="next"
          onClick={() => {
            next && setCurrentLine(next);
            // Returning true triggers the animation/slide out
            return true;
          }}
        />
      }
      okButton={
        <DialogButton
          variant="ok"
          onClick={async () => {
            await save();
            onClose();
          }}
        />
      }
      height={600}
      width={1024}
    >
      {!isLoading ? (
        <>
          <ResponseLineEditForm
            draftLine={draft}
            update={update}
            disabled={isDisabled}
          />
          <ModalTabs
            tabs={tabs}
            sx={{
              bgcolor: 'background.toolbar',
              marginTop: '1px',
              boxShadow: theme => theme.shadows[2],
            }}
          />
        </>
      ) : (
        <BasicSpinner />
      )}
    </Modal>
  );
};
