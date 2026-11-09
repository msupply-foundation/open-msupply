import { lazy } from 'solid-js';
import { Route } from '@solidjs/router';

const RnrFormsList = lazy(() => import('./list/RnrFormsList'));
const RnrFormDetailView = lazy(() => import('./detail/RnrFormDetailView'));

export const rnrFormsRoutes = () => (
  <>
    <Route path="/" component={RnrFormsList} />
    <Route path="/:rnrFormId" component={RnrFormDetailView} />
  </>
);
