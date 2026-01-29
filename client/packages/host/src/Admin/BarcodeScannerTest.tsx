import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  ButtonWithIcon,
  parseResult,
  ScanResult as ParsedScanResult,
} from '@openmsupply-client/common';
import { XCircleIcon, DeleteIcon, CheckIcon, RefreshIcon } from '@common/icons';

// Extend window type to include honeywell plugin
declare global {
  interface Window {
    plugins?: {
      honeywell?: {
        claim?: (callback: () => void) => void;
        release?: () => void;
        listen?: (
          success: (data: string) => void,
          error: (err: string) => void
        ) => void;
        scan?: () => void;
      };
    };
  }
}

interface ScanResult {
  text: string;
  timestamp: Date;
  parsed?: ParsedScanResult;
}

export const BarcodeScannerTest = () => {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initLog, setInitLog] = useState<string[]>([]);

  const addLog = (message: string) => {
    setInitLog(prev => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  useEffect(() => {
    // Check if the plugin is available
    const honeywell = window.plugins?.honeywell;

    addLog('Checking for Honeywell plugin...');

    if (!honeywell) {
      const errorMsg = 'Honeywell barcode scanner plugin is not available';
      setError(errorMsg);
      addLog(`ERROR: ${errorMsg}`);
      return;
    }

    addLog('Honeywell plugin found');
    addLog(`Available methods: ${Object.keys(honeywell).join(', ')}`);

    // Cleanup on unmount
    return () => {
      addLog('Component unmounting - releasing scanner...');
      if (window.plugins?.honeywell?.release) {
        window.plugins.honeywell.release();
        addLog('Scanner released');
      }
    };
  }, []);

  const startScanning = () => {
    const honeywell = window.plugins?.honeywell;

    if (!honeywell) {
      addLog('ERROR: Honeywell plugin not available');
      return;
    }

    addLog('Starting scanner...');

    honeywell.listen!(
      (data: string) => {
        addLog(`Barcode scanned: ${data}`);
        const parsed = parseResult(data);
        addLog(`Parsed GTIN: ${parsed.gtin || 'N/A'}`);
        addLog(`Parsed Batch: ${parsed.batch || 'N/A'}`);
        setScanResults(prev => [
          {
            text: data,
            timestamp: new Date(),
            parsed,
          },
          ...prev,
        ]);
      },
      (err: string) => {
        addLog(`Scanning error: ${err}`);
        setError(`Scanning error: ${err}`);
        setIsScanning(false);
      }
    );

    setIsScanning(true);
    addLog('Listener active - scanner is now listening');
  };

  const stopScanning = () => {
    const honeywell = window.plugins?.honeywell;

    if (!honeywell) {
      addLog('ERROR: Honeywell plugin not available');
      return;
    }

    addLog('Stopping scanner...');
    honeywell.release!();
    setIsScanning(false);
    addLog('Scanner stopped');
  };

  const restartScanning = () => {
    const honeywell = window.plugins?.honeywell;

    if (!honeywell) {
      addLog('ERROR: Honeywell plugin not available');
      return;
    }

    addLog('Restarting scanner (claim + listen)...');

    honeywell.claim!(() => {
      addLog('Scanner claimed successfully');

      if (!window.plugins?.honeywell) {
        addLog('ERROR: Honeywell plugin lost after claim');
        return;
      }

      window.plugins!.honeywell!.listen!(
        (data: string) => {
          addLog(`Barcode scanned: ${data}`);
          const parsed = parseResult(data);
          addLog(`Parsed GTIN: ${parsed.gtin || 'N/A'}`);
          addLog(`Parsed Batch: ${parsed.batch || 'N/A'}`);
          setScanResults(prev => [
            {
              text: data,
              timestamp: new Date(),
              parsed,
            },
            ...prev,
          ]);
        },
        (err: string) => {
          addLog(`Scanning error: ${err}`);
          setError(`Scanning error: ${err}`);
          setIsScanning(false);
        }
      );

      setIsScanning(true);
      addLog('Listener active after restart');
    });
  };

  const clearResults = () => {
    setScanResults([]);
    addLog('Results cleared');
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Barcode Scanner Test
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Scanner Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Scanner Controls
        </Typography>
        <Box display="flex" gap={2} flexWrap="wrap">
          {!isScanning ? (
            <>
              <ButtonWithIcon
                Icon={<CheckIcon />}
                label="Start Scanning"
                variant="contained"
                color="primary"
                onClick={startScanning}
              />
              <ButtonWithIcon
                Icon={<RefreshIcon />}
                label="Restart Scanning"
                variant="outlined"
                onClick={restartScanning}
              />
            </>
          ) : (
            <ButtonWithIcon
              Icon={<XCircleIcon />}
              label="Stop Scanning"
              variant="contained"
              color="error"
              onClick={stopScanning}
            />
          )}
          <ButtonWithIcon
            Icon={<DeleteIcon />}
            label="Clear Results"
            variant="outlined"
            onClick={clearResults}
            disabled={scanResults.length === 0}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Initialization Log
        </Typography>
        {initLog.length === 0 ? (
          <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No logs yet...
          </Typography>
        ) : (
          <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
            {initLog.map((log, index) => (
              <Typography
                key={index}
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  mb: 0.5,
                }}
              >
                {log}
              </Typography>
            ))}
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Scanner Status
        </Typography>
        <Typography>
          <strong>Status:</strong>{' '}
          {isScanning ? '🟢 Scanning Active' : '🔴 Not Scanning'}
        </Typography>
        <Typography sx={{ mt: 1 }}>
          <strong>Total Scans:</strong> {scanResults.length}
        </Typography>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Scan Results
        </Typography>
        {scanResults.length === 0 ? (
          <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
            No scans yet. Start scanning and use the scanner trigger to scan a
            barcode.
          </Typography>
        ) : (
          <List>
            {scanResults.map((result, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Divider />}
                <ListItem>
                  <ListItemText
                    primary={
                      <Box>
                        <Typography
                          sx={{
                            fontFamily: 'monospace',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            mb: 1,
                          }}
                        >
                          {result.text}
                        </Typography>
                        {result.parsed && (
                          <Box sx={{ mt: 1 }}>
                            {result.parsed.gtin && (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>GTIN:</strong> {result.parsed.gtin}
                              </Typography>
                            )}
                            {result.parsed.batch && (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>Batch:</strong> {result.parsed.batch}
                              </Typography>
                            )}
                            {result.parsed.expiryDate && (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>Expiry Date:</strong>{' '}
                                {result.parsed.expiryDate}
                              </Typography>
                            )}
                            {result.parsed.manufactureDate && (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>Manufacture Date:</strong>{' '}
                                {result.parsed.manufactureDate}
                              </Typography>
                            )}
                            {result.parsed.quantity && (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>Quantity:</strong>{' '}
                                {result.parsed.quantity}
                              </Typography>
                            )}
                            {result.parsed.packsize && (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>Pack Size:</strong>{' '}
                                {result.parsed.packsize}
                              </Typography>
                            )}
                            {result.parsed.gs1string && (
                              <Typography
                                variant="body2"
                                sx={{
                                  mt: 1,
                                  fontFamily: 'monospace',
                                  fontSize: '0.85rem',
                                  color: 'text.secondary',
                                }}
                              >
                                <strong>GS1:</strong> {result.parsed.gs1string}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography component="span" variant="body2">
                        Time: {result.timestamp.toLocaleTimeString()}
                      </Typography>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};
