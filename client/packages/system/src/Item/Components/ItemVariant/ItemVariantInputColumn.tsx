// import React from 'react';
// import { RecordWithId, ColumnDefinition } from '@openmsupply-client/common';
// import { VariantFragment } from '../../api';
// import { ItemVariantSearchInput } from './ItemVariantSearchInput';
// import { useUnitVariant } from '../../context';

// export const getItemVariantInputColumn = <
//   T extends RecordWithId,
// >(): ColumnDefinition<T> => ({
//   key: 'variantInput',
//   label: 'label.pack-unit',
//   sortable: false,
//   width: 200,
//   Cell: ({ rowData, column, columnIndex, rowIndex, isDisabled }) => {
//     const { options, setDefaultOption } = useUnitVariant(rowData.id);

//     const value = column.accessor({
//       rowData,
//     }) as VariantFragment | null;

//     const onChange = (_: VariantFragment | null) => {
//       setDefaultOption();
//     };

//     const autoFocus = columnIndex === 0 && rowIndex === 0;

//     return (
//       <ItemVariantSearchInput
//         autoFocus={autoFocus}
//         disabled={!!isDisabled}
//         value={value}
//         onChange={onChange}
//         options={options}
//       />
//     );
//   },
// });
