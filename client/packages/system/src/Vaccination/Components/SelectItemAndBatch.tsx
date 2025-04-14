import {
  Switch,
  useAuthContext,
  useTranslation,
} from '@openmsupply-client/common';
import React from 'react';
import { VaccinationDraft } from '../api';
import {
  VaccinationCourseDoseFragment,
  VaccinationDetailFragment,
} from '../api/operations.generated';
import { SelectBatch } from './SelectBatch';
import { SelectItem } from './SelectItem';
import { getSwitchReason } from './getSwitchReason';

export const SelectItemAndBatch = ({
  draft,
  dose,
  vaccination,
  isOtherFacility,
  updateDraft,
}: {
  dose: VaccinationCourseDoseFragment;
  draft: VaccinationDraft;
  vaccination?: VaccinationDetailFragment | null;
  isOtherFacility: boolean;
  updateDraft: (update: Partial<VaccinationDraft>) => void;
}) => {
  const t = useTranslation();
  const { storeId } = useAuthContext();

  const isHistorical = draft.date?.toDateString() !== new Date().toDateString();

  const givenAtOtherStore =
    vaccination?.given && vaccination.givenStoreId !== storeId;

  const showBatchSelect =
    !givenAtOtherStore &&
    !isOtherFacility &&
    (!isHistorical || draft.createTransactions || vaccination?.stockLine);

  const transactionSwitchReason = getSwitchReason(draft, vaccination);

  return (
    <>
      {draft.given && (
        <>
          <SelectItem dose={dose} draft={draft} updateDraft={updateDraft} />
          {draft.itemId && showBatchSelect && (
            <SelectBatch
              isNewlyGiven={!vaccination || !vaccination.given} // If only just now setting given, allow batch auto-select
              itemId={draft.itemId}
              stockLine={draft.stockLine ?? null}
              setStockLine={stockLine => updateDraft({ stockLine })}
            />
          )}
        </>
      )}

      {!givenAtOtherStore && transactionSwitchReason && (
        <Switch
          label={t(transactionSwitchReason)}
          checked={draft.createTransactions}
          onChange={() =>
            updateDraft({
              createTransactions: !draft.createTransactions,
            })
          }
          labelPlacement="end"
          size="small"
        />
      )}
    </>
  );
};
