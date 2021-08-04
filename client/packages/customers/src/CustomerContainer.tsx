import React, { FC } from 'react';

// This is a remote service which is exposed by this package.
// This component can be imported by another remote who declares
// this package as a remote in their webpack config and imported through:
// React.lazy(() => import("template/service"))

const CustomerContainer: FC = () => {
  return <span>This is the customer service!</span>;
};

export default CustomerContainer;
