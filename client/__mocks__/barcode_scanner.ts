const scanner: any = jest.createMockFromModule(
  '@capacitor-community/barcode-scanner'
);

scanner.useRegisterActions = () => {};

module.exports = scanner;

export default {};
