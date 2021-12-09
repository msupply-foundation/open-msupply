import React, { FC } from 'react';
import {
  styled,
  TabPanel,
  useColumns,
  Box,
  HeaderCell,
  alpha,
  Checkbox,
  BasicTextInput,
  useTranslation,
} from '@openmsupply-client/common';
import { StocktakeLine } from '../../../../types';

interface StocktakeLinePanelProps {
  value: string;
  batches: StocktakeLine[];
}

const StyledTabPanel = styled(TabPanel)({
  height: '100%',
});

const StyledTabContainer = styled(Box)(({ theme }) => ({
  height: 300,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: theme.palette.divider,
  borderRadius: '20px',
  flexDirection: 'row',
  display: 'flex',
}));

const StyledStaticArea = styled(Box)(({ theme }) => ({
  backgroundColor: alpha(theme.palette.background.menu, 0.4),
  width: 300,
  display: 'flex',
  flexDirection: 'column',
}));

export const StocktakeLinePanel: FC<StocktakeLinePanelProps> = ({
  value,
  batches,
  children,
}) => {
  const t = useTranslation();
  const [selectionColumn, batchColumn] = useColumns([
    { key: 'count', label: 'label.count-this-line', width: 200 },
    ['batch', { width: 100 }],
  ]);

  return (
    <StyledTabPanel value={value}>
      <StyledTabContainer>
        <StyledStaticArea>
          <Box height="40px" display="flex" alignItems="center">
            <HeaderCell dense column={selectionColumn} />
            <HeaderCell dense column={batchColumn} />
          </Box>

          {batches.map((line, index) => {
            const { id, batch, countThisLine } = line;
            return (
              <Box
                flexDirection="row"
                display="flex"
                alignItems="center"
                key={id}
              >
                <Box
                  paddingLeft="16px"
                  paddingRight="16px"
                  width="125px"
                  display="flex"
                  flexDirection="row"
                  alignItems="center"
                >
                  <Checkbox
                    key={id}
                    checked={countThisLine}
                    onClick={() =>
                      line.update(
                        'countThisLine',
                        countThisLine ? 'false' : 'true'
                      )
                    }
                  />
                  <Box>{`${t('label.line', { line: index + 1 })}`}</Box>
                </Box>

                <Box
                  flexDirection="row"
                  display="flex"
                  alignItems="center"
                  paddingLeft="16px"
                  paddingRight="16px"
                >
                  <BasicTextInput value={batch} />
                </Box>
              </Box>
            );
          })}
        </StyledStaticArea>
        {children}
      </StyledTabContainer>
    </StyledTabPanel>
  );
};
