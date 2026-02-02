import { DialogButton, TextField } from '@common/components';
import { Portal, Box } from '@mui/material';
import React, { useState, useRef, useEffect } from 'react';

export const useMockScanner = (isScanning: boolean) => {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);
  const resolveRef = useRef<((value: string) => void) | null>(null);
  const scanHandler = useRef<((barcode: string) => void) | null>(null);

  // Ctrl-Shift-S to start mock scanner listening (will open input overlay)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key === 'S') {
        event.preventDefault();
        setOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = () => {
    if (resolveRef.current) {
      resolveRef.current(inputValue);
      resolveRef.current = null;

      setInputValue('');
    }
    if (scanHandler.current) {
      scanHandler.current(inputValue);
    }
  };

  const startListening = async (handler: (barcode: string) => void) => {
    scanHandler.current = handler;
    setOpen(true);
  };

  const stopListening = async () => {
    scanHandler.current = null;
    setOpen(false);
  };

  const scannerInput =
    isScanning || open ? (
      <Portal>
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
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
    return new Promise(resolve => {
      resolveRef.current = resolve;
    });
  };

  return {
    scan,
    scannerInput,
    startListening,
    stopListening,
    isOpen: open,
  };
};
