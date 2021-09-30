import React from 'react';
import { LocaleKey } from '../../../intl/intlHelpers';
import { Button, TextButton } from '../../components/buttons';

export type ButtonDefinition = {
  icon?: JSX.Element;
  labelKey: LocaleKey;
  onClick: () => void;
  order?: number;
};

type Button = {
  component: JSX.Element;
  order: number;
};

const createButtonComponent = (buttonProps: ButtonDefinition) => {
  const { icon, labelKey, onClick } = buttonProps;

  if (!buttonProps.icon)
    return <TextButton labelKey={labelKey} onClick={onClick} />;

  return <Button labelKey={labelKey} onClick={onClick} icon={icon} />;
};

export class ButtonSetBuilder {
  buttons: Button[];
  currentOrder: number;

  constructor() {
    this.buttons = [];
    this.currentOrder = 100;
  }

  private addOrder(button?: { order?: number }) {
    if (button?.order == null) {
      return this.currentOrder++;
    }

    return button.order;
  }

  addButton(buttonDefinition: ButtonDefinition): ButtonSetBuilder {
    const order = this.addOrder(buttonDefinition);

    this.buttons.push({
      component: createButtonComponent(buttonDefinition),
      order,
    });

    return this;
  }

  build(): JSX.Element[] {
    this.currentOrder = 100;
    const sortedButtons = this.buttons.sort((a, b) => {
      const { order: aOrder = 0 } = a;
      const { order: bOrder = 0 } = b;

      if (aOrder < bOrder) {
        return -1;
      } else {
        return 1;
      }
    });

    this.buttons = [];

    return sortedButtons.map(b => b.component);
  }
}
