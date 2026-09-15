/**
 * This should be removed when you manage to fix the import of uuid
 * The package is currently included in compilation as it was breaking all tests
 * but the compilation is breaking functionality, given that it isn't critical,
 * have mocked it out for now
 */

export const v4 = () => {
  const uuid = Math.random() * 100000000;
  return String(uuid);
};
