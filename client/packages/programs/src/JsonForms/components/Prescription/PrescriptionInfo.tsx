import React from 'react';
import {
  Alert,
  ArrowRightIcon,
  Box,
  Link,
  RouteBuilder,
  useFormatDateTime,
  useTranslation,
} from '@openmsupply-client/common';
import { AppRoute } from '@openmsupply-client/config';
import { PrescriptionRowFragment } from 'packages/invoices/src/Prescriptions';

interface PrescriptionInfoProps {
  prescription: PrescriptionRowFragment | void;
}

export const PrescriptionInfo = ({ prescription }: PrescriptionInfoProps) => {
  const t = useTranslation();
  const { localisedDate } = useFormatDateTime();

  const getPrescriptionInfo = () => {
    const prescriptionLine = prescription?.lines.nodes[0];
    if (!prescriptionLine) return;
    else {
      const issued =
        prescriptionLine.numberOfPacks * (prescriptionLine.packSize ?? 0);

      const message = t('messages.prescription-given', {
        item: `${prescriptionLine.itemName}`,
        amount: issued,
        date: localisedDate(
          prescription.createdDatetime ?? prescription.pickedDatetime
        ),
      });
      return message;
    }
  };

  if (!prescription) {
    return (
      <Alert severity="info">
        <Box>{t('messages.prescription-will-be-created')}</Box>
      </Alert>
    );
  }

  return (
    <Alert
      severity="success"
      sx={{
        marginRight: 0,
        width: '100%',
        '& .MuiAlert-message': {
          width: '100%',
        },
      }}
    >
      <Box display="flex" alignItems="center" justifyContent="space-between">
        <Box display="flex" alignItems="center">
          {getPrescriptionInfo()}
        </Box>
        <Box>
          {prescription.id && (
            <Link
              style={{
                paddingLeft: 6,
                fontWeight: 'bold',
                alignItems: 'center',
                display: 'flex',
              }}
              to={RouteBuilder.create(AppRoute.Dispensary)
                .addPart(AppRoute.Prescription)
                .addPart(String(prescription?.invoiceNumber))
                .build()}
              target="_blank"
            >
              {t('button.view-prescription')}
              <ArrowRightIcon />
            </Link>
          )}
        </Box>
      </Box>
    </Alert>
  );
};
