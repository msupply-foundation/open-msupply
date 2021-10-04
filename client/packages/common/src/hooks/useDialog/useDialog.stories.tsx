import React from 'react';
import { useDialog } from './useDialog';
import { Story } from '@storybook/react';
import { Button } from '@mui/material';
import { DialogButton } from '../../ui/components/buttons/DialogButton';

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

  const { Modal, hideDialog, showDialog } = useDialog({
    title: 'heading.add-item',
  });

  return (
    <div>
      <Modal
        cancelButton={<DialogButton variant="cancel" onClick={onCancel} />}
        nextButton={<DialogButton variant="next" onClick={onOkNext} />}
        okButton={<DialogButton variant="ok" onClick={onOk} />}
      >
        <div>This is an example dialog. There&apos;s nothing much to see</div>
      </Modal>
      <div>
        <b>Button clicked:</b> {result}
      </div>
      <Button onClick={showDialog}>Show Dialog</Button>
    </div>
  );
};

export const Primary = Template.bind({});
