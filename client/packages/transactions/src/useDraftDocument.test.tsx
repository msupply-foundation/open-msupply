// import React from 'react';
// import { render, waitFor } from '@testing-library/react';
// import { OutboundShipmentDetailView } from './OutboundShipment';
// import { TestingProvider } from '@openmsupply-client/common';
// import { MemoryRouter, Routes, Route } from 'react-router';

// export const renderWithRouterMatch = (
//   Component,
//   { path = '/', route = '/' }
// ) => {
//   return render(
//     <MemoryRouter initialEntries={[route]}>
//       <Routes>
//         <Route path="customers/customer-invoice">
//           <Route path={':id'} element={Component} />
//         </Route>
//       </Routes>
//     </MemoryRouter>
//   );
// };

// describe('useDraftDocument', () => {
//   it('', async () => {
//     const { getByText, debug } = renderWithRouterMatch(
//       <TestingProvider>
//         <OutboundShipmentDetailView />
//       </TestingProvider>,
//       {
//         path: '/customers/customer-invoice',
//         route: '/customers/customer-invoice/3',
//       }
//     );

//     await waitFor(() => expect(getByText(/"id": "3"/i)).toBeInTheDocument());

//     debug();
//   });
// });
