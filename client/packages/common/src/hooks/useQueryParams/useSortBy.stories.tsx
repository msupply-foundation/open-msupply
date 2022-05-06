// import React from 'react';
// import { useSortBy } from './useSortBy';
// import { Story } from '@storybook/react';
// import { useColumns, Column } from '../../ui/layout';
// import { BaseButton } from '@common/components';

// export default {
//   title: 'Hooks/useSortBy',
// };

// interface TestSortBy {
//   id: string;
//   itemName: string;
//   itemCode: number;
// }

// const Template: Story = () => {
//   const columns = useColumns<TestSortBy>([
//     'itemName',
//     'itemCode',
//   ]) as unknown as [Column<TestSortBy>, Column<TestSortBy>];
//   const { sortBy, onChangeSortBy } = useSortBy<TestSortBy>({ key: 'itemName' });

//   return (
//     <div>
//       <div>
//         <span> Two buttons to sort by two different keys, Name or Code.</span>
//         <BaseButton onClick={() => onChangeSortBy(columns[0])}>
//           Sort by Name!
//         </BaseButton>
//         <BaseButton onClick={() => onChangeSortBy(columns[1])}>
//           Sort by Code!
//         </BaseButton>
//       </div>

//       <p style={{ whiteSpace: 'pre' }}>{JSON.stringify(sortBy, null, 2)}</p>
//     </div>
//   );
// };

// export const Primary = Template.bind({});
