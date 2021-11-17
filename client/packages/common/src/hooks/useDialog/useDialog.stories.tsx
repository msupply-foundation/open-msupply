import React from 'react';
import { useDialog } from './useDialog';
import { Story } from '@storybook/react';

import { DialogButton } from '../../ui/components/buttons/standard/DialogButton';
import { BaseButton } from '../../ui/components/buttons/standard/BaseButton';

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

  const { Modal, hideDialog, showDialog } = useDialog();

  return (
    <div>
      <Modal
        title="heading.add-item"
        cancelButton={<DialogButton variant="cancel" onClick={onCancel} />}
        nextButton={<DialogButton variant="next" onClick={onOkNext} />}
        okButton={<DialogButton variant="ok" onClick={onOk} />}
      >
        <div>This is an example dialog. There&apos;s nothing much to see</div>
      </Modal>
      <div>
        <b>Button clicked:</b> {result}
      </div>
      <BaseButton onClick={showDialog}>Show Dialog</BaseButton>
    </div>
  );
};

export const Primary = Template.bind({});
