import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { OkKeyBindings, OkKeyBindingsProps } from './OkKeyBindings';

describe('OkKeyBindings', () => {
  const defaultProps: OkKeyBindingsProps = {
    onOk: jest.fn(),
    okDisabled: false,
  };
  const withNextProps: OkKeyBindingsProps = {
    ...defaultProps,
    onNext: jest.fn(),
    nextDisabled: false,
  };

  beforeEach(() => jest.clearAllMocks());

  it('calls onOk callback when Enter key is pressed', () => {
    const { container } = render(<OkKeyBindings {...defaultProps} />);
    fireEvent.keyDown(container, { key: 'Enter' });
    expect(defaultProps.onOk).toHaveBeenCalled();
  });

  it('calls onNext callback when Enter key is pressed and onNext is provided', () => {
    const { container } = render(<OkKeyBindings {...withNextProps} />);
    fireEvent.keyDown(container, { key: 'Enter' });
    expect(withNextProps.onNext).toHaveBeenCalled();
  });

  it('calls onOk when ctrl+Enter is pressed when onNext also provided', () => {
    const { container } = render(<OkKeyBindings {...withNextProps} />);
    fireEvent.keyDown(container, { key: 'Enter', ctrlKey: true });
    expect(withNextProps.onOk).toHaveBeenCalled();
  });

  it('does not call onOk callback when Enter key is pressed and okDisabled is true', () => {
    const { container } = render(
      <OkKeyBindings {...defaultProps} okDisabled={true} />
    );
    fireEvent.keyDown(container, { key: 'Enter' });
    expect(defaultProps.onOk).not.toHaveBeenCalled();
  });

  it('does not call onNext callback when Enter key is pressed and nextDisabled is true', () => {
    const { container } = render(
      <OkKeyBindings {...withNextProps} nextDisabled={true} />
    );
    fireEvent.keyDown(container, { key: 'Enter' });
    expect(withNextProps.onNext).not.toHaveBeenCalled();
  });
});
