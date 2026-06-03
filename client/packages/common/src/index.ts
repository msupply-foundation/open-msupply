import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

// Note: kbar is NOT re-exported from common — it would otherwise land
// in the federation-shared bundle and ship its ~36KB (+ fuse.js 15KB)
// to every page including /login, which doesn't use the command palette.
// Consumers import from 'kbar' directly.

export {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  useQuery,
  UseQueryResult,
  QueryClient,
  keepPreviousData,
} from '@tanstack/react-query';

export {
  matchPath,
  useLocation,
  Location,
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

export { create, useShallow };
