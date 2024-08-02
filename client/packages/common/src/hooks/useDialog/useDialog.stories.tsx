import React from 'react';
import { useDialog } from './useDialog';
import { StoryFn } from '@storybook/react';

import { BaseButton, DialogButton } from '@common/components';

export default {
  title: 'Hooks/useDialog',
};

const Template: StoryFn = () => {
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
        title="Add Item"
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
