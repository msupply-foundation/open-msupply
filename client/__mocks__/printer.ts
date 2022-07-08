const printer: any = jest.createMockFromModule(
  '@awesome-cordova-plugins/printer'
);

printer.useRegisterActions = () => {};

module.exports = printer;

export default {};
