import { set } from 'lodash';
import {
  BaseButton,
  BasicTextInput,
  Box,
  DetailInputWithLabelRow,
  FnUtils,
  NumericTextInput,
  RouteBuilder,
  Stack,
  TextWithLabelRow,
  Typography,
  useHostContext,
  useNavigate,
  useParams,
} from 'packages/common/src';
import { AppRoute } from 'packages/config/src';
import { useItemById } from 'packages/system/src';
import React, { FC, useEffect } from 'react';
import BarcodeScannerComponent from 'react-qr-barcode-scanner';

const PrescriptionComponent: FC = () => {
  const { fullScreen, setFullScreen } = useHostContext();
  const { invoiceNumber } = useParams();

  const [barcodeData, setBarcodeData] = React.useState<string | undefined>(
    undefined
  );
  const [hideScanner, setHideScanner] = React.useState(false);
  const [quantity, setQuantity] = React.useState<number>(1);
  const navigate = useNavigate();
  const { innerWidth: width } = window;
  const { data: item, refetch, isLoading } = useItemById(barcodeData);

  useEffect(() => {
    if (!fullScreen) {
      setFullScreen(true);
    }
  }, [fullScreen]);

  useEffect(() => {
    if (barcodeData) {
      refetch();
    }
  }, [barcodeData]);

  useEffect(() => {
    if (item) {
      setHideScanner(true);
    }
  }, [item]);

  return (
    <Box display="flex" flexDirection="column">
      <Stack spacing={1} flexGrow={1}>
        {!hideScanner && (
          <>
            <Typography sx={{ textAlign: 'center' }} variant="body1">
              Use this video screen to scan the barcode you want to add to the
              prescription
            </Typography>
            <BarcodeScannerComponent
              width={width}
              onUpdate={(err, result) => {
                if (result) {
                  setBarcodeData(result.getText());
                } else {
                  setBarcodeData(undefined);
                }
              }}
              onError={err => {
                if (err.toString() === 'NotAllowedError') {
                  alert(
                    "Barcode Scanner won't work unless you allow camera access."
                  );
                }
                console.error(err);
              }}
              stopStream={barcodeData !== undefined}
            />
          </>
        )}
        {isLoading && <Typography>Looking up item...</Typography>}
        {item && (
          <>
            <Typography sx={{ textAlign: 'center' }} variant="h3">
              Found Item
            </Typography>
            <TextWithLabelRow label="Name" text={item?.name} />
            <TextWithLabelRow label="Code" text={item?.code} />
            <DetailInputWithLabelRow
              label={'Quantity'}
              inputAlignment={'start'}
              Input={
                <NumericTextInput
                  InputProps={{
                    sx: { '& .MuiInput-input': { textAlign: 'right' } },
                  }}
                  onChange={value => {
                    setQuantity(value ?? 1);
                  }}
                  disabled={false}
                  value={quantity}
                />
              }
            />
            <Box display="flex" justifyContent="center">
              <BaseButton
                onClick={() => {
                  navigate(
                    RouteBuilder.create(AppRoute.Dispensary)
                      .addPart(AppRoute.Mobile)
                      .addPart(AppRoute.Prescription)
                      .addPart(invoiceNumber ?? 'NO_INVOICE_NUMBER')
                      .addPart(item?.id ?? 'NO_ITEM_ID')
                      .build()
                  );
                }}
              >
                Accept
              </BaseButton>
            </Box>
          </>
        )}
      </Stack>
      {item && (
        <Box display="flex" justifyContent="center" padding={2}>
          <BaseButton
            variant="outlined"
            sx={{}}
            onClick={() => {
              setHideScanner(false);
              setBarcodeData(undefined);
            }}
          >
            Scan Again
          </BaseButton>
        </Box>
      )}
    </Box>
  );
};

export const MobilePrescriptionScanView: FC = () => <PrescriptionComponent />;
