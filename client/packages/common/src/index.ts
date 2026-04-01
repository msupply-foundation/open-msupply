import { create } from 'zustand';

export {
  KBarProvider,
  KBarPortal,
  KBarPositioner,
  KBarAnimator,
  KBarSearch,
  KBarResults,
  useRegisterActions,
  useMatches,
} from 'kbar';

export {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
  QueryClient,
} from 'react-query';
export type { UseQueryResult } from 'react-query';

export {
  matchPath,
  useLocation,
  Link,
  useNavigate,
  useParams,
  HashRouter,
  Routes,
  Route,
  Navigate,
  useMatch,
  createBrowserRouter,
  createRoutesFromElements,
  RouterProvider,
} from 'react-router-dom';
export type { Location } from 'react-router-dom';

export * from './utils';
export * from './ui';
export * from './hooks';
export * from './intl';
export * from './styles';
export * from './localStorage';
export * from './types';
export * from './api';
export * from './authentication';
export * from './plugins';

export { create };
