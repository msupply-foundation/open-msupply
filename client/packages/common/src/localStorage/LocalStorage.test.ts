import LocalStorage from './LocalStorage';

describe('LocalStorage', () => {
  it('Gets null when no value is set for the key', () => {
    const value = LocalStorage.getItem('/appdrawer/open');
    expect(value).toEqual(null);
  });
  it('Gets the default value passed when no value is set for the key', () => {
    const value = LocalStorage.getItem('/appdrawer/open', 'test');
    expect(value).toEqual('test');
  });
  it('Sets and Gets a value correctly', () => {
    LocalStorage.setItem('/appdrawer/open', {});
    const value = LocalStorage.getItem('/appdrawer/open');
    expect(value).toEqual({});
  });
});
