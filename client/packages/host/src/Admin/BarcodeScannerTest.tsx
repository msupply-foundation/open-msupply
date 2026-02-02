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
} from '@openmsupply-client/common';
import { useTranslation } from '@common/intl';
import { XCircleIcon, DeleteIcon, CheckIcon } from '@common/icons';

interface ScanResult {
  text: string;
  timestamp: Date;
  parsed?: ParsedScanResult;
}

export const BarcodeScannerTest = () => {
  const t = useTranslation();
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { isScanning, isEnabled, startScanning, stopScan, availableScanners } =
    useBarcodeScannerContext();

  useEffect(() => {
    // Auto-start scanning for Honeywell and Manual when page loads
    if (!isScanning) {
      if (
        availableScanners.includes(
          AvailableScannerType.Honeywell ||
            availableScanners.includes(AvailableScannerType.Mock)
        )
      ) {
        handleStartScanning();
      }
    }

    // Cleanup on unmount
    return () => {
      if (isScanning) {
        stopScan();
      }
    };
    // only need to respond to changes in available scanners
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableScanners]);

  const handleStartScanning = async () => {
    try {
      await startScanning((result, err) => {
        if (err) {
          setError(`${t('messages.scanning-error')}: ${err}`);
          return;
        }

        setScanResults(prev => [
          {
            text: result.content || '',
            timestamp: new Date(),
            parsed: result,
          },
          ...prev,
        ]);
      });
    } catch (e) {
      const errorMsg = (e as Error)?.message || t('messages.unknown-error');
      setError(`${t('messages.unknown-error')}: ${errorMsg}`);
    }
  };

  const handleStopScanning = async () => {
    try {
      await stopScan();
    } catch (e) {
      const errorMsg = (e as Error)?.message || t('messages.unknown-error');
      setError(`${t('messages.unknown-error')}: ${errorMsg}`);
    }
  };

  const clearResults = () => {
    setScanResults([]);
    setError(null);
  };

  return (
    <Box sx={{ padding: 3 }}>
      <Typography variant="h4" gutterBottom>
        {t('label.barcode-scanner-test')}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {!isEnabled && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {t('messages.no-barcode-scanner-available')}
        </Alert>
      )}

      {/* Scanner Controls */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('heading.scanner-controls')}
        </Typography>

        <Box display="flex" gap={2} flexWrap="wrap">
          <>
            {!isScanning ? (
              <ButtonWithIcon
                Icon={<CheckIcon />}
                label={t('button.enable-scanning')}
                variant="contained"
                color="primary"
                onClick={handleStartScanning}
                disabled={!isEnabled}
              />
            ) : (
              <ButtonWithIcon
                Icon={<XCircleIcon />}
                label={t('button.disable-scanning')}
                variant="contained"
                color="error"
                onClick={handleStopScanning}
              />
            )}
          </>

          <ButtonWithIcon
            Icon={<DeleteIcon />}
            label={t('button.clear-results')}
            variant="outlined"
            onClick={clearResults}
            disabled={scanResults.length === 0}
          />
        </Box>
      </Paper>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('heading.scanner-status')}
        </Typography>
        <Typography sx={{ mt: 1 }}>
          <strong>{t('label.status')}:</strong>{' '}
          {isScanning
            ? `🟢 ${t('label.scanning-active')}`
            : `🔴 ${t('label.not-scanning')}`}
        </Typography>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          {t('heading.scan-results')}
        </Typography>
        {scanResults.length === 0 ? (
          <Typography color="text.secondary" sx={{ fontStyle: 'italic' }}>
            {t('messages.no-scans-yet')}
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
                                <strong>{t('label.gtin')}:</strong>{' '}
                                {result.parsed.gtin}
                              </Typography>
                            )}
                            {result.parsed.batch && (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>{t('label.batch')}:</strong>{' '}
                                {result.parsed.batch}
                              </Typography>
                            )}
                            {result.parsed.expiryDate && (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>{t('label.expiry')}:</strong>{' '}
                                {result.parsed.expiryDate}
                              </Typography>
                            )}
                            {result.parsed.manufactureDate && (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>{t('label.manufacture-date')}:</strong>{' '}
                                {result.parsed.manufactureDate}
                              </Typography>
                            )}
                            {result.parsed.quantity && (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>{t('label.quantity')}:</strong>{' '}
                                {result.parsed.quantity}
                              </Typography>
                            )}
                            {result.parsed.packsize && (
                              <Typography variant="body2" sx={{ mb: 0.5 }}>
                                <strong>{t('label.pack-size')}:</strong>{' '}
                                {result.parsed.packsize}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    }
                    secondary={
                      <Typography component="span" variant="body2">
                        {t('label.time')}:{' '}
                        {result.timestamp.toLocaleTimeString()}
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
