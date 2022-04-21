import { renderHook } from '@testing-library/react';
import { useEditModal } from './useEditModal';
import { act } from '@testing-library/react';
import { ModalMode } from './useEditModal';

describe('useEditModal', () => {
  it('has the correct initial state', () => {
    const { result } = renderHook(useEditModal);

    expect(result.current).toEqual({
      entity: null,
      isOpen: false,
      mode: null,
      onClose: expect.any(Function),
      onOpen: expect.any(Function),
    });
  });

  it('opens the modal in update mode when passing an entity', () => {
    const { result } = renderHook(useEditModal);

    act(() => {
      result.current.onOpen({ id: 'a' });
    });

    expect(result.current).toEqual({
      entity: expect.objectContaining({ id: 'a' }),
      isOpen: true,
      mode: ModalMode.Update,
      onClose: expect.any(Function),
      onOpen: expect.any(Function),
    });
  });

  it('opens the modal in create mode when opening with no entity passed', () => {
    const { result } = renderHook(useEditModal);

    act(() => {
      result.current.onOpen();
    });

    expect(result.current).toEqual({
      entity: null,
      isOpen: true,
      mode: ModalMode.Create,
      onClose: expect.any(Function),
      onOpen: expect.any(Function),
    });
  });

  it('resets the state correctly once the modal has been closed after opening in create mode', () => {
    const { result } = renderHook(useEditModal);

    act(() => {
      result.current.onOpen();
      result.current.onClose();
    });

    expect(result.current).toEqual({
      entity: null,
      isOpen: false,
      mode: null,
      onClose: expect.any(Function),
      onOpen: expect.any(Function),
    });
  });

  it('resets the state correctly once the modal has been closed after opening in update mode', () => {
    const { result } = renderHook(useEditModal);

    act(() => {
      result.current.onOpen({ id: 'id' });
      result.current.onClose();
    });

    expect(result.current).toEqual({
      entity: null,
      isOpen: false,
      mode: null,
      onClose: expect.any(Function),
      onOpen: expect.any(Function),
    });
  });
});
