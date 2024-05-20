import React, { useState } from 'react';
import { fireEvent, render } from '@testing-library/react';
import { NumericTextInput, NumericTextInputProps } from './NumericTextInput';
import { TestingProvider } from '@common/utils';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

describe('Test NumericTextInput component', () => {
  const TestNumericTextInput = (props: NumericTextInputProps) => {
    const [value, setValue] = useState<number | undefined>();
    return (
      <TestingProvider>
        <NumericTextInput
          value={value}
          onChange={value => setValue(value)}
          {...props}
        />
      </TestingProvider>
    );
  };

  it('should handle decimal number input', async () => {
    const { getByRole } = render(
      <TestNumericTextInput decimalLimit={10} data-testid="1234" />
    );
    const input = getByRole('textbox');

    await fireEvent.change(input, { target: { value: '1.' } });
    expect(input).toHaveValue('1.');
    // expect(input).toHaveValue('7');
    // await fireEvent.focusOut(input);
    await sleep(2000);
    await fireEvent.blur(input);
    expect(input).toHaveValue('1');

    // fireEvent.change(input, { target: { value: '1.7001' } });
    // expect(input).toHaveValue('1.7001');
    // fireEvent.blur(input);
    // expect(input).toHaveValue('1.7001');

    // fireEvent.change(input, { target: { value: '1.700' } });
    // expect(input).toHaveValue('1.700');
    // fireEvent.blur(input);
    // expect(input).toHaveValue('1.7');
  });

  // it('should handle non-negative decimal number input', async () => {
  //   const { getByRole } = render(
  //     <TestNumericTextInput decimalLimit={10} allowNegative={false} />
  //   );
  //   const input = getByRole('textbox');

  //   fireEvent.change(input, { target: { value: '-1.' } });
  //   expect(input).toHaveValue('1.');

  //   fireEvent.change(input, { target: { value: '-1.7001' } });
  //   expect(input).toHaveValue('1.7001');

  //   fireEvent.change(input, { target: { value: '-1.700' } });
  //   expect(input).toHaveValue('1.700');
  // });

  // it('should handle decimalMin', async () => {
  //   const { getByRole } = render(
  //     <TestNumericTextInput decimalLimit={10} decimalMin={2} />
  //   );
  //   const input = getByRole('textbox');

  //   fireEvent.change(input, { target: { value: '1' } });
  //   expect(input).toHaveValue('1');
  //   fireEvent.blur(input);
  //   expect(input).toHaveValue('1.00');

  //   fireEvent.change(input, { target: { value: '1.' } });
  //   expect(input).toHaveValue('1.');
  //   fireEvent.blur(input);
  //   expect(input).toHaveValue('1.00');

  //   fireEvent.change(input, { target: { value: '1.1' } });
  //   expect(input).toHaveValue('1.1');
  //   fireEvent.blur(input);
  //   expect(input).toHaveValue('1.10');

  //   fireEvent.change(input, { target: { value: '1.123' } });
  //   expect(input).toHaveValue('1.123');
  //   fireEvent.blur(input);
  //   expect(input).toHaveValue('1.123');
  // });

  // it('should handle decimalMin where decimalLimit < decimalMin', async () => {
  //   const { getByRole } = render(
  //     <TestNumericTextInput decimalLimit={1} decimalMin={3} />
  //   );
  //   const input = getByRole('textbox');

  //   fireEvent.change(input, { target: { value: '1.11' } });
  //   expect(input).toHaveValue('1.1');
  //   fireEvent.blur(input);
  //   expect(input).toHaveValue('1.100');
  // });

  // it('should handle negative number input', async () => {
  //   const { getByRole } = render(<TestNumericTextInput allowNegative />);
  //   const input = getByRole('textbox');

  //   fireEvent.change(input, { target: { value: '-' } });
  //   expect(input).toHaveValue('-');
  //   fireEvent.change(input, { target: { value: '-5' } });
  //   expect(input).toHaveValue('-5');
  //   fireEvent.blur(input);
  //   expect(input).toHaveValue('-5');
  // });

  // it('should handle removing input', async () => {
  //   const { getByRole } = render(<TestNumericTextInput />);
  //   const input = getByRole('textbox');

  //   fireEvent.change(input, { target: { value: '500' } });
  //   expect(input).toHaveValue('500');
  //   fireEvent.change(input, { target: { value: '' } });
  //   expect(input).toHaveValue('');
  //   fireEvent.blur(input);
  //   expect(input).toHaveValue('');
  // });

  // it('should format large numbers', async () => {
  //   const { getByRole } = render(<TestNumericTextInput />);
  //   const input = getByRole('textbox');

  //   fireEvent.change(input, { target: { value: '1000' } });
  //   expect(input).toHaveValue('1,000');
  //   fireEvent.blur(input);
  //   expect(input).toHaveValue('1,000');
  // });

  // it('should not format large numbers when explicitly prevented', async () => {
  //   const { getByRole } = render(<TestNumericTextInput noFormatting />);
  //   const input = getByRole('textbox');

  //   fireEvent.change(input, { target: { value: '1000' } });
  //   expect(input).toHaveValue('1000');
  //   fireEvent.blur(input);
  //   expect(input).toHaveValue('1000');
  // });
});
