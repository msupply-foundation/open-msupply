import React, { useEffect, useRef } from 'react';
import {
  BasicSpinner,
  isEqual,
  NothingHere,
  RouteBuilder,
  useBreadcrumbs,
  useConfirmOnLeaving,
  useParams,
} from '@openmsupply-client/common';

import { AppRoute } from '@openmsupply-client/config';
import { usePrescription } from '../api';
import { PrescriptionLineEdit } from './PrescriptionLineEdit';
import { LineEditView } from './toBeCommon/LineEditView';
import { isPrescriptionDisabled } from '../../utils';

export const PrescriptionLineEditView2 = () => {
  const { invoiceNumber, itemId } = useParams();
  const { setCustomBreadcrumbs } = useBreadcrumbs();
  const isDirty = useRef(false);

  const {
    query: { data, loading: isLoading },
  } = usePrescription(); // todo - smol query, just items ?

  const currentItem = data?.items.nodes.find(line => line.id === itemId);

  useEffect(() => {
    setCustomBreadcrumbs({
      2: currentItem?.name || '',
    });
  }, [currentItem]);

  // todo - on line edit?
  useConfirmOnLeaving(
    'prescription-line-edit',
    // TODO: actually - should always check, until autosave
    // Need a custom checking method here, as we don't want to warn user when
    // switching to a different item within this page
    {
      customCheck: (current, next) => {
        if (!isDirty.current) return false;

        const currentPathParts = current.pathname.split('/');
        const nextPathParts = next.pathname.split('/');
        // Compare URLS, but don't include the last part, which is the ItemID
        currentPathParts.pop();
        nextPathParts.pop();
        return !isEqual(currentPathParts, nextPathParts);
      },
    }
  );

  if (isLoading || !itemId) return <BasicSpinner />;
  if (!data) return <NothingHere />;

  return (
    <LineEditView
      baseRoute={RouteBuilder.create(AppRoute.Dispensary)
        .addPart(AppRoute.Prescription + '2')
        .addPart(String(invoiceNumber))}
      items={data.items.nodes}
      currentItemId={itemId}
      allowCreateNew={!isPrescriptionDisabled(data)}
    >
      <PrescriptionLineEdit
        itemId={itemId}
        programId={data?.programId ?? undefined}
      />
    </LineEditView>
  );
};
