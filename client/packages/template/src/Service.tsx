import React, { FC } from 'react';

// This is a remote service which is exposed by this package.
// This component can be imported by another remote who declares
// this package as a remote in their webpack config and imported through:
// React.lazy(() => import("template/service"))

const Service: FC = () => {
  return <span>This is a remote service</span>;
};

export default Service;
