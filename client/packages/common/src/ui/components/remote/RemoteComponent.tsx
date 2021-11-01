import React, { FC } from 'react';
import { useRemoteScript } from '../../../hooks/useRemoteScript';
import { loadAndInjectDeps } from '../../../hooks/useRemoteFn';

interface RemoteComponentProps {
  url: string;
  scope: string;
  module: string;
}

export const RemoteComponent: FC<RemoteComponentProps> = ({
  url,
  scope,
  module,
  ...rest
}) => {
  const { ready, failed } = useRemoteScript(url);

  if (!url) {
    return <h2>No url specified</h2>;
  }

  if (!ready) {
    return <h2>Loading..</h2>;
  }

  if (failed) {
    return <h2>Failed! Uh oh!</h2>;
  }

  const Component = React.lazy(loadAndInjectDeps(scope, module));

  return (
    <React.Suspense fallback="Loading..">
      <Component {...rest} />
    </React.Suspense>
  );
};
