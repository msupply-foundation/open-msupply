// import React from 'react';
// import { usePagination } from './usePagination';
// import { Story } from '@storybook/react';

// export default {
//   title: 'Hooks/usePagination',
// };

// const Template: Story = () => {
//   const { first, offset, page, onChangePage, onChangeFirst } = usePagination();

//   return (
//     <div>
//       <p>
//         the <b>usePaginaton</b> hook provides pagination state, and methods to
//         update the `first` and `offset` values.
//       </p>
//       <h4>Input</h4>
//       <div>
//         <span>change the page: </span>
//         <input
//           value={page}
//           onChange={e => onChangePage(Number(e.target.value))}
//           type="numeric"
//         />
//       </div>
//       <div>
//         <span>change the first/number of rows: </span>
//         <input
//           value={first}
//           onChange={e => onChangeFirst(Number(e.target.value))}
//           type="numeric"
//         />
//       </div>
//       <h4>Result</h4>
//       <p style={{ whiteSpace: 'pre' }}>
//         {JSON.stringify({ first, offset, page }, null, 2)}
//       </p>
//     </div>
//   );
// };

// export const Primary = Template.bind({});
