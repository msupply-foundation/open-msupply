import {
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
import { ItemCannotBeOrderedFragment } from '../../../api';

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
        const ids = (lines?.nodes || []).reduce<Record<string, string>>((acc, line) => {
          if (line?.id) {
            acc[line.id] = line.id;
          }
          return acc;
        }, {});
        const mappedErrors = error.lines.reduce<{
          [purchaseOrderLineId: string]: ItemCannotBeOrderedFragment | undefined;
        }>((acc, errorLine) => {
          const lineId = ids[errorLine.line.id];
          if (lineId) {
            acc[lineId] = errorLine;
          }
          return acc;
        }, {});
        errorsContext.setErrors(mappedErrors);
        return t('error.cannot-order-items');
      }
      case 'InboundShipmentsNotVerified':
        return t('error.inbound-shipments-not-verified');
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

  const isFinalising =
    selectedOption?.value === PurchaseOrderNodeStatus.Finalised;

  const hasOutstandingLines = useMemo(() => {
    if (!isFinalising || !lines?.nodes) return false;
    return lines.nodes.some(line => {
      const ordered = line.adjustedNumberOfUnits ?? line.requestedNumberOfUnits;
      return line.receivedNumberOfUnits < ordered;
    });
  }, [isFinalising, lines]);

  const getInfoMessage = () => {
    if (selectedOption?.value === PurchaseOrderNodeStatus.Confirmed) {
      return t('messages.purchase-order-ready-to-send');
    }
    return undefined;
  };

  const getConfirmation = useConfirmationModal({
    title: t('heading.are-you-sure'),
    message: isFinalising
      ? hasOutstandingLines
        ? t('messages.purchase-order-outstanding-lines')
        : t('messages.purchase-order-finalise-warning')
      : t('messages.confirm-status-as', {
          status: selectedOption?.value
            ? getStatusTranslation(selectedOption?.value)
            : '',
        }),
    info: getInfoMessage(),
    buttonLabel: isFinalising ? t('button.finalise-anyway') : undefined,
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
