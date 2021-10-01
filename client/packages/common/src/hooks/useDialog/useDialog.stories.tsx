import React from 'react';
import { useDialog } from './useDialog';
import { Story } from '@storybook/react';
import { Button } from '@mui/material';

export default {
  title: 'Hooks/useDialog',
};

const Template: Story = () => {
  const [result, setResult] = React.useState('[not shown]');
  const onOk = () => {
    setResult('Ok');
    hideDialog();
  };
  const onOkNext = () => {
    setResult('Ok and Next');
  };
  const onCancel = () => {
    setResult('Cancel');
    hideDialog();
  };

  const body = (
    <div>This is an example dialog. There&apos;s nothing much to see</div>
  );
  const { Modal, hideDialog, showDialog } = useDialog({
    body,
    buttonOverrides: {
      cancel: { onClick: onCancel },
      ok: {
        onClick: onOk,
      },
      okAndNext: {
        onClick: onOkNext,
        visible: true,
      },
    },
  });

  return (
    <div>
      {Modal}
      <div>
        <b>Button clicked:</b> {result}
      </div>
      <Button onClick={showDialog}>Show Dialog</Button>
    </div>
  );
};

export const Primary = Template.bind({});
