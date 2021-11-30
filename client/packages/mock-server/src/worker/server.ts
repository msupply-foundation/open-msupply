import { setupServer, SetupServerApi } from 'msw/node';
import { Handlers } from './handlerfns';

export const setupMockServer = (): SetupServerApi => setupServer(...Handlers);
