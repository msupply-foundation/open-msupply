import { setupWorker, SetupWorkerApi } from 'msw';
import { handlers } from './handlers';

export const setupMockWorker = (): SetupWorkerApi => setupWorker(...handlers);
