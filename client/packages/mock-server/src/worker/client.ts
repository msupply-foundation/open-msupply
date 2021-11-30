import { setupWorker, SetupWorkerApi } from 'msw';
import { Handlers } from './handlers';

export const setupMockWorker = (): SetupWorkerApi => setupWorker(...Handlers);
