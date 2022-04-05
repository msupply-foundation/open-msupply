// Info: https://www.npmjs.com/package/i18n-unused

module.exports = {
  localesPath: 'packages/common/src/intl/locales',
  srcPath: 'packages',
  ignorePaths: [
    'packages/common/node_modules',
    'packages/android/node_modules',
    'packages/config/node_modules',
    'packages/dashboard/node_modules',
    'packages/host/node_modules',
    'packages/inventory/node_modules',
    'packages/invoices/node_modules',
    'packages/requisitions/node_modules',
    'packages/system/node_modules',
    'packages/template/node_modules',
  ],
  flatTranslations: true,
};
