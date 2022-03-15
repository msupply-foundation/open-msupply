export const EnvUtils = {
  // Using isProduction rather than isDevelopment, as we also use a testing
  // environment while running jest, so easier to check !isProduction, generally.
  isProduction: (): boolean => process.env['NODE_ENV'] === 'production',
};
