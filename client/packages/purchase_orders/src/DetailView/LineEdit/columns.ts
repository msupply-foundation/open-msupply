import { useMemo } from "react";
import { DraftPurchaseOrderLine } from "../../api/hooks/usePurchaseOrderLine";
import { ColumnDescription,  DateInputCell,    DateUtils,    Formatter,    NumberInputCell, useColumns } from "@openmsupply-client/common/src";

export const usePurchaseOrderLineEditColumns = ({
    draft,
    updatePatch,
}: {
    draft?: DraftPurchaseOrderLine | null;
    updatePatch: (patch: Partial<DraftPurchaseOrderLine>) => void;
}) => {
    const columnDefinitions: ColumnDescription<DraftPurchaseOrderLine>[] = useMemo(
        () => [
        {
            Cell: NumberInputCell,
            key: 'requestedPackSize',
            label: 'Pack Size',
            setter: patch => {
                updatePatch({ ...patch });
            },
        },
        {
            Cell: DateInputCell,
            key: 'requestedDeliveryDate',
            label: 'Requested delivery date',
            setter: ({id, requestedDeliveryDate}) => {
                updatePatch({ id, requestedDeliveryDate: Formatter.naiveDate(DateUtils.getNaiveDate(requestedDeliveryDate)) });
            },
        },
        {   
            Cell: DateInputCell,
            key: 'expectedDeliveryDate',
            label: 'Expected Delivery Date',
            setter: ({id, expectedDeliveryDate}) => {
                updatePatch({ id, expectedDeliveryDate: Formatter.naiveDate(DateUtils.getNaiveDate(expectedDeliveryDate)) });
            },
        },
        {   
            Cell: NumberInputCell,
            key: 'requestedNumberOfUnits',
            label: 'Requested number of units',
            setter: patch => {
                updatePatch({ ...patch });
            },
        },
        {
            Cell: NumberInputCell,
            key: 'authorisedNumberOfUnits',
            label: 'authorised number of units',
              setter: patch => {
                updatePatch({ ...patch });
            },
        },
        ],
        [updatePatch]
    );

    const columns = useColumns<DraftPurchaseOrderLine>(columnDefinitions, {}, [updatePatch, draft]);
    
    return columns;
}