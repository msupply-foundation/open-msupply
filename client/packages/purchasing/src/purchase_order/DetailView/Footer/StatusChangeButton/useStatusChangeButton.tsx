import {
  mapKeys,
  mapValues,
  PurchaseOrderNodeStatus,
  useAuthContext,
  useConfirmationModal,
  useNotification,
  usePreferences,
  UserPermission,
  useTranslation,
} from '@openmsupply-client/common';
import { usePurchaseOrder } from '../../../api/hooks/usePurchaseOrder';
import { useEffect, useMemo, useState } from 'react';
import {
  getButtonLabel,
  getNextStatusOption,
  getStatusOptions,
  getStatusTranslation,
  PurchaseOrderStatusOption,
} from './utils';
import { usePurchaseOrderLineErrorContext } from '../../../context';

export const useStatusChangeButton = () => {
  const t = useTranslation();
  const { success, error, info } = useNotification();
  const { userHasPermission } = useAuthContext();
  const {
    query: { data },
    update: { update },
  } = usePurchaseOrder();
  const { status, lines } = data ?? {};
  const errorsContext = usePurchaseOrderLineErrorContext();

  const preferences = usePreferences();
  const requiresAuthorisation = preferences?.authorisePurchaseOrder ?? false;

  const options = useMemo(
    () => getStatusOptions(status, getButtonLabel(t), requiresAuthorisation),
    [status, t, requiresAuthorisation]
  );

  const [selectedOption, setSelectedOption] =
    useState<PurchaseOrderStatusOption | null>(() =>
      getNextStatusOption(status, options, requiresAuthorisation)
    );

  const mapStructuredErrors = (result: Awaited<ReturnType<typeof update>>) => {
    if (result?.__typename === 'IdResponse') {
      return undefined;
    }

    if (!result) return;

    const { error } = result;

    switch (error?.__typename) {
      case 'ItemsCannotBeOrdered': {
        const ids = mapValues(
          mapKeys(lines?.nodes, line => line?.id),
          'id'
        );
        const mappedErrors = mapKeys(error.lines, line => ids[line.line.id]);
        errorsContext.setErrors(mappedErrors);
        return t('error.cannot-order-items');
      }
      default:
        return;
    }
  };

  const handleConfirm = async () => {
    if (!selectedOption) return null;

    const status = selectedOption.value as PurchaseOrderNodeStatus | undefined;

    const isAuthorisationBlocked =
      requiresAuthorisation &&
      status === PurchaseOrderNodeStatus.Confirmed &&
      !userHasPermission(UserPermission.PurchaseOrderAuthorise);

    if (isAuthorisationBlocked)
      return info(t('error.no-purchase-order-authorisation-permission'))();

    try {
      const result = await update({ status: selectedOption.value });
      const errorMessage = mapStructuredErrors(result);

      if (errorMessage) {
        error(errorMessage)();
      } else {
        success(t('messages.purchase-order-saved'))();
      }
    } catch (e) {
      error(t('messages.error-saving-purchase-order'))();
    }
  };

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: t('messages.confirm-status-as', {
      status: selectedOption?.value
        ? getStatusTranslation(selectedOption?.value)
        : '',
    }),
    onConfirm: handleConfirm,
  });

  useEffect(() => {
    setSelectedOption(
      getNextStatusOption(status, options, requiresAuthorisation)
    );
  }, [status, options, requiresAuthorisation]);

  return {
    lines,
    options,
    getConfirmation,
    selectedOption,
    setSelectedOption,
  };
};
