import React from 'react';
import { Grid, Paper, Typography } from '@mui/material';
import { Story } from '@storybook/react';
import { styled } from '@mui/material/styles';
import { Autocomplete } from './Autocomplete';
import { AutocompleteList } from './AutocompleteList';
import { AutocompleteOption } from '.';

export default {
  title: 'Inputs/Autocomplete',
  component: Grid,
};

const StyledPaper = styled(Paper)({
  height: 500,
  padding: 10,
  width: 400,
});

const options = Array.from({ length: 100 }).map((_, i) => ({
  label: `${i}`,
}));

const longOptions = [
  {
    label: 'SAINT JOSEPH MOSCATI (HÔPITAL CATHOLIQUE)',
  },
  {
    label: 'CAFOP de YAMOUSSOUKRO (INF-LC PUBLIC)',
  },
  {
    label: 'SAINT VINCENT DE PAUL DE YAMOUSSOUKRO (HÔPITAL PSY',
  },
  {
    label: 'Lycée BAD de YAMOUSSOUKRO (INF-LC PUBLIC)',
  },
  {
    label: 'Lycée Mami Adjoua de YAMOUSSOUKRO (INF-LC PUBLIC)',
  },
  {
    label: 'Lycée Scientifique de YAMOUSSOUKRO (INF-LC PUBLIC)',
  },
  {
    label: 'Garde Republicaine de YAMOUSSOUKRO (INF-M PUBLIC)',
  },
  {
    label: 'GSPM de YAMOUSSOUKRO (INF-M PUBLIC)',
  },
  {
    label: 'Nouvelle Clinique Saint Augustin',
  },
  {
    label: 'INPHB-CENTRE PUBLIC de YAMASSOUKRO',
  },
  {
    label: 'Pharmacie Centrale CHR PUBLIC DE YAMOUSSOUKRO',
  },
  {
    label: 'Dispensation CHR PUBLIC DE YAMOUSSOUKRO',
  },
  {
    label: 'Caisse CHR PUBLIC DE YAMOUSSOUKRO',
  },
  {
    label: 'CHU COCODY central  (Main Warehouse)',
  },
  {
    label: 'Pharmacie Centrale CHU COCODY - ABIDJAN (Main Phar',
  },
  {
    label: 'Pediatrie CHU COCODY - ABIDJAN (Pediatrics)',
  },
  {
    label: 'Maternity CHU COCODY - ABIDJAN',
  },
  {
    label: 'Consultations Externes CHU COCODY',
  },
  {
    label: 'PRIVE CSCT de YAMOUSSOUKRO (INF-PV)',
  },
];

// TODO: Currently the styles are broken for this only within storybook
const BasicTemplate: Story = ({ options }) => (
  <Grid container>
    <Grid item>
      <StyledPaper>
        <Typography>Basic autocomplete</Typography>
        <Autocomplete options={options} width="300px" />
      </StyledPaper>
    </Grid>
    <Grid item>
      <StyledPaper>
        <Typography>Auto Width Popper</Typography>
        <Autocomplete options={options} width="300px" autoWidthPopper />
      </StyledPaper>
    </Grid>
    <Grid item>
      <StyledPaper>
        <Typography>Disabled</Typography>
        <Autocomplete
          options={options}
          width="300px"
          disabled
          defaultValue={'95' as AutocompleteOption<string>}
        />
      </StyledPaper>
    </Grid>
  </Grid>
);

const ListTemplate: Story = () => (
  <Grid container>
    <Grid item>
      <StyledPaper>
        <Typography>Autocomplete List</Typography>
        <AutocompleteList options={options} optionKey="label" />
      </StyledPaper>
    </Grid>
  </Grid>
);

export const Basic = BasicTemplate.bind({});
export const List = ListTemplate.bind({});
export const LongOptions = BasicTemplate.bind({});

Basic.args = { options: options };
LongOptions.args = { options: longOptions, autoWidthPopper: true };
