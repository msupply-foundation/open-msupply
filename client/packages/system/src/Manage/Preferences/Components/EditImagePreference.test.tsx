import React from 'react';
import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TestingProvider } from '@openmsupply-client/common';
import { EditImagePreference, MAX_FILE_BYTES } from './EditImagePreference';

const mockError = jest.fn(() => jest.fn());
const mockSuccess = jest.fn(() => jest.fn());
jest.mock('@common/hooks', () => ({
  ...jest.requireActual('@common/hooks'),
  useNotification: () => ({
    error: mockError,
    success: mockSuccess,
  }),
}));
jest.mock('@common/intl', () => ({
  ...jest.requireActual('@common/intl'),
  useTranslation: () => (key: string) => key,
}));

const PNG_DATA_URL = 'data:image/png;base64,iVBORw0KGgo=';

const uploadFile = (file: File) => {
  const input = document.querySelector(
    'input[type="file"]'
  ) as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
};

describe('EditImagePreference', () => {
  const mockUpdate = jest.fn(async (_: string) => true);

  beforeEach(() => {
    mockError.mockClear();
    mockSuccess.mockClear();
    mockUpdate.mockClear();
  });

  const renderComponent = (value = '') =>
    render(
      <TestingProvider>
        <EditImagePreference
          value={value}
          update={mockUpdate}
          disabled={false}
        />
      </TestingProvider>
    );

  it('saves an uploaded image only on save, as a data URL', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('button.edit'));

    uploadFile(new File(['fake png'], 'logo.png', { type: 'image/png' }));

    // Preview appears once the file is read; nothing is saved yet
    await waitFor(() =>
      expect(
        document.querySelector('img[src^="data:image/png;base64,"]')
      ).toBeInTheDocument()
    );
    expect(mockUpdate).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('button.save'));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.stringMatching(/^data:image\/png;base64,/)
    );
    expect(mockError).not.toHaveBeenCalled();
  });

  it('rejects an unsupported file type', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('button.edit'));

    uploadFile(new File(['<html/>'], 'page.html', { type: 'text/html' }));

    await waitFor(() =>
      expect(mockError).toHaveBeenCalledWith('error.file-type-not-supported')
    );
    fireEvent.click(screen.getByText('button.save'));
    await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
    // Nothing was accepted, so save persists the unchanged (empty) value
    expect(mockUpdate).toHaveBeenCalledWith('');
  });

  it('rejects an oversized file', async () => {
    renderComponent();
    fireEvent.click(screen.getByText('button.edit'));

    const oversized = new File(
      [new Uint8Array(MAX_FILE_BYTES + 1)],
      'big.png',
      { type: 'image/png' }
    );
    uploadFile(oversized);

    await waitFor(() =>
      expect(mockError).toHaveBeenCalledWith('error.file-exceeds-size-limit')
    );
    expect(
      document.querySelector('img[src^="data:image/png;base64,"]')
    ).not.toBeInTheDocument();
  });

  it('clears the image via remove + save', async () => {
    renderComponent(PNG_DATA_URL);
    fireEvent.click(screen.getByText('button.edit'));

    fireEvent.click(screen.getByText('label.remove'));
    fireEvent.click(screen.getByText('button.save'));

    await waitFor(() => expect(mockUpdate).toHaveBeenCalledWith(''));
  });
});
