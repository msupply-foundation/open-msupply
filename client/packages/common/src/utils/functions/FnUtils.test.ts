import { FnUtils } from './FnUtils';

describe('debounce', () => {
  let i = 0;
  const callback = () => {
    const j = (i += 1);
    return j;
  };

  const debounced = FnUtils.debounce(callback);

  it('debounces consecutive calls', async () => {
    i = 0;
    debounced();
    debounced();
    await debounced();

    expect(i).toBe(1);
  });

  it('resolves to be the final value after the timeout has completed', async () => {
    i = 0;

    const result1 = debounced();
    const result2 = debounced();
    const result3 = debounced();

    expect(result1).resolves.toBe(1);
    expect(result2).resolves.toBe(1);
    expect(result3).resolves.toBe(1);
  });
});
