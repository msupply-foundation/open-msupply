import React, { FC } from "react"
import {
  Typography,
  Box,
} from "@openmsupply-client/common";

interface EleProps {
  label: string,
  value: string | number,
}

export const SimpleLabelDisplay: FC<EleProps> = ({ label, value }) => {

  return (
    <Box>
      <Typography sx={{
        fontSize: "0.875rem",
        fontWeight: 'bold',
      }}>
        {label}
      </Typography>
      <Typography sx={{
        fontSize: "1.2rem",
      }}>
        {value}
      </Typography>
    </Box>
  )
}