// Shared-module facade for `@openmsupply/plugin-sdk` — see ./solid.ts.
// Plugins resolve the SDK here at runtime; at build time they see only its
// types (closed imports, spec/plugins/sdk-contract.md).
export * from '@/plugin-sdk';
