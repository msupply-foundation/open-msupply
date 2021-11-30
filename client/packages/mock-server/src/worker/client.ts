import { setupWorker, SetupWorkerApi } from 'msw';
import { Handlers } from './handlerfns';

export const setupMockWorker = (): SetupWorkerApi => setupWorker(...Handlers);
