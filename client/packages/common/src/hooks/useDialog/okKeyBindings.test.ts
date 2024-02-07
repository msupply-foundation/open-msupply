import { OkKeyBindingsInput, makeOkKeyBindingsHandler } from './okKeyBindings';

describe('makeOkKeyBindings', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('when no onNext provided', () => {
    const input: OkKeyBindingsInput = {
      onOk: jest.fn(),
      okDisabled: false,
    };
    it('calls onOk on Enter', () => {
      const handler = makeOkKeyBindingsHandler(input);
      handler({ key: 'Enter', preventDefault: () => {} } as any);
      expect(input.onOk).toHaveBeenCalled();
    });

    it('doesnt call onOk if disabled', () => {
      const handler = makeOkKeyBindingsHandler({ ...input, okDisabled: true });
      handler({ key: 'Enter', preventDefault: () => {} } as any);
      expect(input.onOk).not.toHaveBeenCalled();
    });
  });

  describe('when onNext provided', () => {
    const input: OkKeyBindingsInput = {
      onOk: jest.fn(),
      okDisabled: false,
      onNext: jest.fn(),
      nextDisabled: false,
    };
    it('calls onNext on Enter', () => {
      const handler = makeOkKeyBindingsHandler(input);
      handler({ key: 'Enter', preventDefault: () => {} } as any);
      expect(input.onNext).toHaveBeenCalled();
    });

    it('calls onOk on CTRL+Enter', () => {
      const handler = makeOkKeyBindingsHandler(input);
      handler({ key: 'Enter', ctrlKey: true, preventDefault: () => {} } as any);
      expect(input.onOk).toHaveBeenCalled();
    });

    it('doesnt call onOk if disabled', () => {
      const handler = makeOkKeyBindingsHandler({ ...input, okDisabled: true });
      handler({ key: 'Enter', ctrlKey: true, preventDefault: () => {} } as any);
      expect(input.onOk).not.toHaveBeenCalled();
    });

    it('doesnt call onNext if disabled', () => {
      const handler = makeOkKeyBindingsHandler({
        ...input,
        nextDisabled: true,
      });
      handler({ key: 'Enter', preventDefault: () => {} } as any);
      expect(input.onNext).not.toHaveBeenCalled();
    });
  });
});
