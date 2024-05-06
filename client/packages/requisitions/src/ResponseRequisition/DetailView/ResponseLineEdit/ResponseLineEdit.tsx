import React from 'react';
import {
  useDialog,
  DialogButton,
  BasicSpinner,
  useBufferState,
  ModalTabs,
  useKeyboardHeightAdjustment,
} from '@openmsupply-client/common';
import { ResponseLineEditForm } from './ResponseLineEditForm';
import { useResponse, ResponseLineFragment } from '../../api';
import { useDraftRequisitionLine, useNextResponseLine } from './hooks';
import { RequestStoreStats } from '../ReponseStats/RequestStoreStats';
import { ResponseStoreStats } from '../ReponseStats/ResponseStoreStats';
import { usePackVariant } from '@openmsupply-client/system';

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
  const {
    numberOfPacksToTotalQuantity,
    numberOfPacksFromQuantity,
    variantsControl,
  } = usePackVariant(draft.itemId, draft.item.unitName ?? null);

  const height = useKeyboardHeightAdjustment(600);

  const tabs = [
    {
      Component: (
        <ResponseStoreStats
          stockOnHand={numberOfPacksFromQuantity(
            data?.responseStoreStats.stockOnHand || 0
          )}
          incomingStock={numberOfPacksFromQuantity(
            data?.responseStoreStats.incomingStock || 0
          )}
          stockOnOrder={numberOfPacksFromQuantity(
            data?.responseStoreStats.stockOnOrder || 0
          )}
          requestedQuantity={numberOfPacksFromQuantity(
            data?.responseStoreStats.requestedQuantity || 0
          )}
          otherRequestedQuantity={numberOfPacksFromQuantity(
            data?.responseStoreStats.otherRequestedQuantity || 0
          )}
        />
      ),
      value: 'label.my-store',
    },
    {
      Component: (
        <RequestStoreStats
          maxMonthsOfStock={numberOfPacksFromQuantity(
            data?.requestStoreStats.maxMonthsOfStock || 0
          )}
          suggestedQuantity={numberOfPacksFromQuantity(
            data?.requestStoreStats.suggestedQuantity || 0
          )}
          availableStockOnHand={numberOfPacksFromQuantity(
            data?.requestStoreStats.stockOnHand || 0
          )}
          averageMonthlyConsumption={numberOfPacksFromQuantity(
            data?.requestStoreStats.averageMonthlyConsumption || 0
          )}
        />
      ),
      value: 'label.customer',
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
          onClick={async () => {
            await save();
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
      height={height}
      width={1024}
    >
      {!isLoading ? (
        <>
          <ResponseLineEditForm
            draftLine={draft}
            update={update}
            disabled={isDisabled}
            variantsControl={variantsControl}
            numberOfPacksFromQuantity={numberOfPacksFromQuantity}
            numberOfPacksToTotalQuantity={numberOfPacksToTotalQuantity}
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
