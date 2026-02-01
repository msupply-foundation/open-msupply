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
  ScanResult as ParsedScanResult,
  useBarcodeScannerContext,
  AvailableScannerType,
  TextField,
  InputAdornment,
} from '@openmsupply-client/common';
import { XCircleIcon, DeleteIcon, CheckIcon, ScanIcon } from '@common/icons';

interface ScanResult {
  text: string;
  timestamp: Date;
  parsed?: ParsedScanResult;
}

export const BarcodeScannerTest = () => {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initLog, setInitLog] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');
  const {
    isScanning,
    isEnabled,
    activeScanner,
    startScanning,
    stopScan,
    scan: scanOnce,
    triggerManualScan,
  } = useBarcodeScannerContext();

  const addLog = (message: string) => {
    setInitLog(prev => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  useEffect(() => {
    addLog('Barcode Scanner Test initialized');
    addLog(`Scanner enabled: ${isEnabled}`);
    addLog(`Active scanner: ${activeScanner}`);

    // Auto-start scanning for Honeywell and Manual when page loads
    if (
      (activeScanner === AvailableScannerType.Honeywell ||
        activeScanner === AvailableScannerType.Manual) &&
      !isScanning
    ) {
      addLog(`Auto-starting ${activeScanner} scanner...`);
      handleStartScanning();
    }

    // Cleanup on unmount
    return () => {
      if (isScanning) {
        addLog('Component unmounting - stopping scanner...');
        stopScan();
      }
    };
  }, [activeScanner]);

  const handleStartScanning = async () => {
    try {
      addLog('Starting continuous scanning...');
      await startScanning((result, err) => {
        if (err) {
          addLog(`Scanning error: ${err}`);
          setError(`Scanning error: ${err}`);
          return;
        }

        addLog(`Barcode scanned: ${result.content}`);
        if (result.gtin) addLog(`Parsed GTIN: ${result.gtin}`);
        if (result.batch) addLog(`Parsed Batch: ${result.batch}`);

        setScanResults(prev => [
          {
            text: result.content || '',
            timestamp: new Date(),
            parsed: result,
          },
          ...prev,
        ]);
      });
      addLog('Continuous scanning active');
    } catch (e) {
      const errorMsg = (e as Error)?.message || 'Unknown error';
      addLog(`Error starting scanner: ${errorMsg}`);
      setError(`Error: ${errorMsg}`);
    }
  };

  const handleStopScanning = async () => {
    try {
      addLog('Stopping scanner...');
      await stopScan();
      addLog('Scanner stopped');
    } catch (e) {
      const errorMsg = (e as Error)?.message || 'Unknown error';
      addLog(`Error stopping scanner: ${errorMsg}`);
      setError(`Error: ${errorMsg}`);
    }
  };

  const handleScanOnce = async () => {
    try {
      addLog('Initiating single scan...');
      const result = await scanOnce();

      if (result.content) {
        addLog(`Barcode scanned: ${result.content}`);
        if (result.gtin) addLog(`Parsed GTIN: ${result.gtin}`);
        if (result.batch) addLog(`Parsed Batch: ${result.batch}`);

        setScanResults(prev => [
          {
            text: result.content || '',
            timestamp: new Date(),
            parsed: result,
          },
          ...prev,
        ]);
      } else {
        addLog('Scan canceled or no result');
      }
    } catch (e) {
      const errorMsg = (e as Error)?.message || 'Unknown error';
      addLog(`Error during scan: ${errorMsg}`);
      setError(`Error: ${errorMsg}`);
    }
  };

  const handleManualScan = () => {
    if (!manualInput.trim()) return;

    addLog(`Manual scan: ${manualInput}`);
    triggerManualScan(manualInput);
    setManualInput('');
  };

  const handleManualKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleManualScan();
    }
  };

  const clearResults = () => {
    setScanResults([]);
    setError(null);
    addLog('Results cleared');
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        Barcode Scanner Test
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!isEnabled && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          No barcode scanner available on this device
        </Alert>
      )}

      {/* Scanner Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Scanner Controls
        </Typography>

        {/* Manual Scanner Input */}
        {activeScanner === AvailableScannerType.Manual && (
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Enter Barcode Manually"
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              onKeyPress={handleManualKeyPress}
              placeholder="Type or scan barcode and press Enter"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <ButtonWithIcon
                      Icon={<ScanIcon />}
                      label="Scan"
                      onClick={handleManualScan}
                      disabled={!manualInput.trim()}
                    />
                  </InputAdornment>
                ),
              }}
              helperText="Type barcode manually or use a scanner that types like a keyboard"
            />
          </Box>
        )}

        <Box display="flex" gap={2} flexWrap="wrap">
          {activeScanner !== AvailableScannerType.Honeywell &&
            activeScanner !== AvailableScannerType.Manual && (
              <ButtonWithIcon
                Icon={<ScanIcon />}
                label="Scan Barcode"
                variant="contained"
                color="primary"
                onClick={handleScanOnce}
                disabled={!isEnabled || isScanning}
              />
            )}

          {activeScanner !== AvailableScannerType.Manual && (
            <>
              {!isScanning ? (
                <ButtonWithIcon
                  Icon={<CheckIcon />}
                  label="Start Continuous Scanning"
                  variant="contained"
                  color="primary"
                  onClick={handleStartScanning}
                  disabled={!isEnabled}
                />
              ) : (
                <ButtonWithIcon
                  Icon={<XCircleIcon />}
                  label="Stop Scanning"
                  variant="contained"
                  color="error"
                  onClick={handleStopScanning}
                />
              )}
            </>
          )}

          {activeScanner === AvailableScannerType.Manual && (
            <>
              {!isScanning ? (
                <ButtonWithIcon
                  Icon={<CheckIcon />}
                  label="Enable Manual Scanning"
                  variant="contained"
                  color="primary"
                  onClick={handleStartScanning}
                  disabled={!isEnabled}
                />
              ) : (
                <ButtonWithIcon
                  Icon={<XCircleIcon />}
                  label="Disable Manual Scanning"
                  variant="contained"
                  color="error"
                  onClick={handleStopScanning}
                />
              )}
            </>
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
          Scanner Status
        </Typography>
        <Typography>
          <strong>Scanner Type:</strong> {activeScanner}
        </Typography>
        <Typography sx={{ mt: 1 }}>
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
            No scans yet.{' '}
            {activeScanner === AvailableScannerType.Honeywell
              ? 'Use the scanner trigger to scan a barcode.'
              : activeScanner === AvailableScannerType.Manual
                ? 'Enter a barcode in the input field above.'
                : 'Click "Scan Barcode" to start scanning.'}
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
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          Log
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
    </Box>
  );
};
