import { DialogButton, TextField } from '@common/components';
import { Portal, Box } from '@mui/material';
import React, { useState, useRef } from 'react';

export const useMockScanner = (enabled: boolean) => {
  const [inputValue, setInputValue] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const resolveRef = useRef<((value: string) => void) | null>(null);
  const scanHandler = useRef<((barcode: string) => void) | null>(null);

  const handleSubmit = () => {
    if (resolveRef.current) {
      resolveRef.current(inputValue);
      resolveRef.current = null;
      setInputValue('');
    }
    if (scanHandler.current) {
      scanHandler.current(inputValue);
    }
    setIsScanning(false);
  };

  const startListening = async (handler: (barcode: string) => void) => {
    scanHandler.current = handler;
    setIsListening(true);
    setIsScanning(true);
  };

  const stopListening = async () => {
    scanHandler.current = null;
    setIsListening(false);
    setIsScanning(false);
  };

  const scannerInput =
    enabled && (isScanning || isListening) ? (
      <Portal>
        <div
          style={{
            position: 'fixed',
            top: '20px',
            left: '20px',
            zIndex: 9999,
            width: '300px',
            backgroundColor: 'white',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
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
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <DialogButton variant="ok" onClick={handleSubmit} />
            <DialogButton variant="cancel" onClick={stopListening} />
          </Box>
        </div>
      </Portal>
    ) : null;

  const scan = async (): Promise<string> => {
    setIsScanning(true);
    return new Promise(resolve => {
      resolveRef.current = resolve;
    });
  };

  return {
    scan,
    scannerInput,
    startListening,
    stopListening,
    isOpen: isScanning,
  };
};
