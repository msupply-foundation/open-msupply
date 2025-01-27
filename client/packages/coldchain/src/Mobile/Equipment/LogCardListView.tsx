import React, { FC } from "react";
import {
  NothingHere,
  useTranslation,
  BasicSpinner,
  useFormatDateTime,
  Formatter,
} from "@openmsupply-client/common";
import { Box, Typography, Card, CardContent } from "@mui/material";
import { SimpleLabelDisplay } from "../Components/SimpleLabelDisplay";
import { useActivityLog } from '@openmsupply-client/system/src/ActivityLog/api';

export const LogCardListView: FC<{ recordId: string }> = ({ recordId }) => {
  const t = useTranslation();
  const { data, isError, isLoading } = useActivityLog.document.listByRecord(recordId);
  const { localisedDate, localisedTime } = useFormatDateTime();

  if (isLoading) return <BasicSpinner />;

  if (isError) {
    return (
      <Box sx={{ padding: 2 }}>
        <Typography sx={{ color: 'error.main' }}>
          {t('error.unable-to-load-data')}
        </Typography>
      </Box>
    );
  }

  if (data?.totalCount === 0 || !data) {
    return <NothingHere body={t('error.no-items-to-display')} />
  }

  return (
    <Box sx={{
      width: '100%',
      flex: 1,
    }}>
      <Box sx={{
        display: 'flex',
        flexDirection: "column",
        alignItems: 'center',
        padding: '0px 5px 10px 0px',
        gap: 1,
        overflow: 'auto',
        overflowY: 'scroll',
      }}>

        {data.nodes.map(l => (
          <Card key={l.id} sx={{
            minWidth: 330,
            maxWidth: 450,
            padding: '10px 5px',
            border: '1px solid',
            borderColor: '#eee',
            borderRadius: '16px',
          }}
          >
            <CardContent>
              <SimpleLabelDisplay
                label=""
                value={localisedDate(l.datetime) || "n/a"}
              />
              <SimpleLabelDisplay
                label="Time"
                value={localisedTime(l.datetime) || "n/a"}
              />
              <SimpleLabelDisplay
                label="User"
                value={l.user?.username || "n/a"}
              />
              <SimpleLabelDisplay
                label="Event"
                value={t(Formatter.logTypeTranslation(l.type), {
                  defaultValue: l.type,
                }) || "n/a"}
              />
              <SimpleLabelDisplay
                label="Details"
                value={l?.from && l.to ?
                  `[${l.from}] ${t('log.changed-to')} [${l.to}]`
                  :
                  `${t('log.changed-from')} [${l.from}]`
                }
              />
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  )
}