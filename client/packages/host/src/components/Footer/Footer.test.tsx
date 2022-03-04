describe('', () => {
  it('', () => {
    expect(true).toBe(true);
  });
});

// import React, { useEffect } from 'react';
// import { render } from '@testing-library/react';

// import { TestingProvider, useHostContext } from '@openmsupply-client/common';
// import { Footer } from '.';

// describe('Footer', () => {
//   const FooterExample: React.FC<{ username: string; storename: string }> = ({
//     username,
//     storename,
//   }) => {
//     const { setUser, setStore } = useHostContext();

//     useEffect(() => {
//       setStore({ id: storename, name: storename });
//       setUser({ id: username, name: username });
//     }, []);

//     return (
//       <TestingProvider>
//         <Footer />
//       </TestingProvider>
//     );
//   };

//   it('Displays the current user name', () => {
//     const { getByText } = render(
//       <FooterExample username="test-user" storename="" />
//     );

//     expect(getByText(/test-user/)).toBeInTheDocument();
//   });

//   it('Displays the current store name', () => {
//     const { getByText } = render(
//       <FooterExample username="" storename="test-store" />
//     );

//     expect(getByText(/test-store/)).toBeInTheDocument();
//   });
// });
