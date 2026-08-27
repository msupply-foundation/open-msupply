import LocalStorage from './LocalStorage';

describe('LocalStorage', () => {
  beforeEach(() => {
    LocalStorage.clearListeners();
  });

  it('Gets null when no value is set for the key', () => {
    const value = LocalStorage.getItem('/appdrawer/open');
    expect(value).toEqual(null);
  });
  it('Gets the default value passed when no value is set for the key', () => {
    const value = LocalStorage.getItem('/appdrawer/open', true);
    expect(value).toEqual(true);
  });
  it('Sets and Gets a value correctly', () => {
    LocalStorage.setItem('/appdrawer/open', true);
    const value = LocalStorage.getItem('/appdrawer/open');
    expect(value).toEqual(true);
  });
  it('Registered listeners are called when an item is set', () => {
    const mocked = jest.fn();
    LocalStorage.addListener(mocked);
    LocalStorage.setItem('/appdrawer/open', true);

    expect(mocked).toBeCalledTimes(1);
  });
  it('Registered listeners are removed correctly', () => {
    const mocked = jest.fn();
    const remove = LocalStorage.addListener(mocked);
    const numberOfListenersBefore = LocalStorage.listeners.size;

    remove();

    const numberOfListenersAfter = LocalStorage.listeners.size;

    expect(numberOfListenersBefore).toBe(1);
    expect(numberOfListenersAfter).toBe(0);
  });
});
