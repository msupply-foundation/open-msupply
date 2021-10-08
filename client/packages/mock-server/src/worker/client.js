import { setupWorker } from 'msw';
import { handlers } from './handlers';

export const setupMockWorker = () => setupWorker(...handlers);
