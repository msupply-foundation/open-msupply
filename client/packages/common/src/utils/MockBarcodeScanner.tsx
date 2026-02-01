import { BasicModal, DialogButton, TextField } from '@common/components';
import React, { useState, useRef } from 'react';

export const useMockScanner = (isScanning: boolean) => {
  const [inputValue, setInputValue] = useState('');
  const resolveRef = useRef<((value: string) => void) | null>(null);

  const handleSubmit = () => {
    if (resolveRef.current) {
      resolveRef.current(inputValue);
      resolveRef.current = null;
      setInputValue('');
    }
  };

  const mockScannerInput = (
    <BasicModal
      open={isScanning}
      sx={{
        padding: 4,
        display: 'flex',
        gap: 2,
      }}
      width={400}
      height={200}
    >
      <TextField
        label="Enter Barcode"
        value={inputValue}
        autoFocus
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {
            handleSubmit();
          }
        }}
      />
      <DialogButton variant="ok" onClick={handleSubmit} />
    </BasicModal>
  );

  const mockScan = async (): Promise<string> => {
    return new Promise(resolve => {
      resolveRef.current = resolve;
    });
  };

  return { mockScan, mockScannerInput };
};
