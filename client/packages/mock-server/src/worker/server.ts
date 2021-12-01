import { setupServer, SetupServerApi } from 'msw/node';
import { Handlers } from './handlers';

export const setupMockServer = (): SetupServerApi => setupServer(...Handlers);
