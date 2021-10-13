import React from 'react';
import { Grid, Button } from '@mui/material';
import { Story } from '@storybook/react';
import { ListSearch } from './ListSearch';

export default {
  title: 'Modals/ListSearch',
  component: ListSearch,
};

const options = Array.from({ length: 100 }).map((_, i) => ({
  name: `${i}`,
}));

const Template: Story = () => {
  const [open, setOpen] = React.useState(false);

  return (
    <Grid>
      <Button onClick={() => setOpen(true)}> Open Modal </Button>
      <ListSearch
        title="app.admin"
        open={open}
        onClose={() => setOpen(false)}
        options={options}
        optionKey="name"
      />
    </Grid>
  );
};

export const Primary = Template.bind({});
