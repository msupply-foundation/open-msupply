import { setupServer, SetupServerApi } from 'msw/node';
import { handlers } from './handlers';

export const setupMockServer = (): SetupServerApi => setupServer(...handlers);
