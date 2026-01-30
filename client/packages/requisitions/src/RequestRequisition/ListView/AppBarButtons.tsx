import React, { FC, useState } from 'react';
import {
  FnUtils,
  PlusCircleIcon,
  AppBarButtonsPortal,
  ButtonWithIcon,
  Grid,
  useTranslation,
  ToggleState,
  useNavigate,
  RouteBuilder,
  useSimplifiedTabletUI,
  usePreferences,
  DialogButton,
  ConfirmationModal,
} from '@openmsupply-client/common';
import { ExportSelector } from '@openmsupply-client/system';
import { useRequest } from '../api';
import { requestsToCsv } from '../../utils';
import { CreateRequisitionModal } from './CreateRequisitionModal';
import { AppRoute } from '@openmsupply-client/config';
import { NewRequisitionType } from '../../types';
import { useRecentStocktakes } from '../api/hooks/utils/useRecentStocktakes';
import { getUniqueItemCountInStocktakeLines } from './utils';

export const AppBarButtons: FC<{
  modalController: ToggleState;
}> = ({ modalController }) => {
  const t = useTranslation();
  const navigate = useNavigate();
  const { mutateAsync: onCreate } = useRequest.document.insert();
  const { insert: onProgramCreate } = useRequest.document.insertProgram();

  const { isLoading, fetchAsync } = useRequest.document.listAll({
    key: 'createdDatetime',
    direction: 'desc',
    isDesc: true,
  });
  const simplifiedTabletView = useSimplifiedTabletUI();

  // Warning when you don't have a recent stocktake with enough items
  const prefs = usePreferences();

  const {
    query: { data: recentStocktakeData, isLoading: stocktakeLoading },
  } = useRecentStocktakes(
    prefs.warnWhenMissingRecentStocktake?.enabled ?? false,
    prefs.warnWhenMissingRecentStocktake?.maxAge
  );

  const uniqueStocktakeItemCount =
    getUniqueItemCountInStocktakeLines(recentStocktakeData);

  // Determine whether to show the stocktake too old warning
  const showOldStocktakeWarning =
    prefs.warnWhenMissingRecentStocktake?.enabled &&
    prefs.warnWhenMissingRecentStocktake?.minItems !== undefined &&
    uniqueStocktakeItemCount < prefs.warnWhenMissingRecentStocktake?.minItems;

  const [confirmationState, setConfirmationState] = useState<boolean>(false);

  const handleAddRequisitionClick = () => {
    if (showOldStocktakeWarning) {
      setConfirmationState(true);
    } else {
      modalController.toggleOn();
    }
  };

  const getCsvData = async () => {
    const data = await fetchAsync();
    return data?.nodes?.length ? requestsToCsv(data.nodes, t) : null;
  };

  return (
    <AppBarButtonsPortal>
      <Grid container gap={1}>
        <ButtonWithIcon
          disabled={stocktakeLoading}
          Icon={<PlusCircleIcon />}
          label={t('label.new-internal-order')}
          onClick={handleAddRequisitionClick}
        />
        {!simplifiedTabletView && (
          <ExportSelector
            getCsvData={getCsvData}
            filename={t('filename.requests')}
            isLoading={isLoading}
          />
        )}
      </Grid>
      <ConfirmationModal
        open={confirmationState}
        title={t('heading.are-you-sure')}
        message={t('warning.insufficient-recent-stocktake-items', {
          minItems: prefs.warnWhenMissingRecentStocktake?.minItems,
          maxAge: prefs.warnWhenMissingRecentStocktake?.maxAge,
        })}
        buttonLabel={t('button.continue-without-stocktake')}
        width={700}
        onConfirm={() => {
          setConfirmationState(false);
          modalController.toggleOn();
        }}
        onCancel={() => {
          setConfirmationState(false);
        }}
        placeCancelButtonLast={true}
        otherButtons={[
          <DialogButton
            key="go-to-stocktakes"
            variant="back"
            customLabel={t('button.go-to-stocktakes')}
            onClick={() =>
              navigate(
                RouteBuilder.create(AppRoute.Inventory)
                  .addPart(AppRoute.Stocktakes)
                  .build()
              )
            }
          />,
        ]}
      />
      <CreateRequisitionModal
        isOpen={modalController.isOn}
        onClose={modalController.toggleOff}
        onCreate={async newRequisition => {
          switch (newRequisition.type) {
            case NewRequisitionType.General:
              return onCreate({
                id: FnUtils.generateUUID(),
                otherPartyId: newRequisition.name.id,
              }).then(({ id }) => {
                modalController.toggleOff();
                navigate(
                  RouteBuilder.create(AppRoute.Replenishment)
                    .addPart(AppRoute.InternalOrder)
                    .addPart(id)
                    .build()
                );
              });
            case NewRequisitionType.Program:
              // eslint-disable-next-line @typescript-eslint/no-unused-vars
              const { type: _, ...rest } = newRequisition;
              return onProgramCreate({
                id: FnUtils.generateUUID(),
                ...rest,
              }).then(response => {
                if (response.__typename == 'RequisitionNode') {
                  modalController.toggleOff();
                  navigate(
                    RouteBuilder.create(AppRoute.Replenishment)
                      .addPart(AppRoute.InternalOrder)
                      .addPart(String(response.id))
                      .build()
                  );
                }
              });
          }
        }}
      />
    </AppBarButtonsPortal>
  );
};
