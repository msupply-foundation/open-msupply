import { ColumnAlign, ColumnDescription,  GenericColumnKey, TooltipTextCell, useColumns, useUrlQueryParams } from "@openmsupply-client/common/src";
import { GoodsReceivedLineFragment } from "../api/operations.generated";
import { PackQuantityCell } from "packages/system/src";



export const useGoodsReceivedColumns = () => {
      const {
        updateSortQuery,
        queryParams: { sortBy },
      } = useUrlQueryParams({ initialSort: { key: 'itemName', dir: 'asc' } });

      const columnDefinitions: ColumnDescription<GoodsReceivedLineFragment>[] = [
          GenericColumnKey.Selection,
          [
            'lineNumber',
            {
              width: 90,
              accessor: ({ rowData }) => rowData.lineNumber,
              getSortValue: rowData => rowData.lineNumber ?? 0,
            },
          ],
          [
            'itemCode',
            {
              width: 130,
              accessor: ({ rowData }) => rowData.item.code,
              getSortValue: rowData => rowData.item.code,
            },
          ],
          [
            'itemName',
            {
              Cell: TooltipTextCell,
              width: 350,
              accessor: ({ rowData }) => rowData.item.name,
              getSortValue: rowData => rowData.item.name,
            },
          ],
          // batch
          // expiry
          // pack size
          {
            key: 'packSize',
            label: 'label.pack-size',
            align: ColumnAlign.Right,
            accessor: ({ rowData }) => rowData.receivedPackSize,
            getSortValue: rowData => rowData.receivedPackSize ?? 1,
            defaultHideOnMobile: true,
          },
          // number of packs
          {
            key: 'numberOfPacks',
            label: 'label.num-packs',
            align: ColumnAlign.Right,
            width: 150,
            Cell: PackQuantityCell,
            accessor: rowData =>
              Math.ceil(
                (rowData.rowData.numberOfPacksReceived ?? 0) /
                  (rowData.rowData.receivedPackSize &&
                  rowData.rowData.receivedPackSize !== 0
                    ? rowData.rowData.receivedPackSize
                    : 1)
              ),
          },
        ];
      
        const columns = useColumns<GoodsReceivedLineFragment>(
          columnDefinitions,
          {
            onChangeSortBy: updateSortQuery,
            sortBy,
          },
          [updateSortQuery, sortBy]
        );
      
        return { columns, sortBy, onChangeSortBy: updateSortQuery };
}