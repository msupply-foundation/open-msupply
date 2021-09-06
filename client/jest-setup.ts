import '@testing-library/jest-dom';

import { setScreenSize_ONLY_FOR_TESTING } from '@openmsupply-client/common';
import { setupMockServer } from '@openmsupply-client/mocks/src/server';

let mockStorage: Record<string, string> = {};

beforeAll(() => {
  global.Storage.prototype.setItem = jest.fn((key, value) => {
    mockStorage[key] = value;
  });
  global.Storage.prototype.getItem = jest.fn(key => {
    return mockStorage[key] ?? null;
  });
});

afterAll(() => {
  (global.Storage.prototype.setItem as jest.Mock).mockReset();
  (global.Storage.prototype.getItem as jest.Mock).mockReset();
});

beforeEach(() => {
  mockStorage = {};
});

/**
 * Before each test, create a matching media for the width
 * of the screen. This ensures hooks like `isSmallScreen`
 * correctly return a value. Breakpoints here:
 * https://material-ui.com/customization/breakpoints/
 *
 * This will set the screen to larger than the md breakpoint
 * after each test.
 *
 *
 */
beforeEach(() => {
  setScreenSize_ONLY_FOR_TESTING(1280);
});

const server = setupMockServer();

beforeAll(() => {
  // Establish requests interception layer before all tests.
  server.listen();
});
afterAll(() => {
  // Clean up after all tests are done, preventing this
  // interception layer from affecting irrelevant tests.
  server.close();
});
