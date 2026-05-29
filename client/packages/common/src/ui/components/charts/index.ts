// Note: `recharts` is intentionally NOT re-exported from common. It is
// ~350KB and pulls into the module-federation shared bundle if exposed here.
// The few chart consumers (requisitions item-charts, programs encounter
// chart, coldchain temperature chart) import directly from `recharts`,
// which lets webpack split it into its own async vendor chunk.

export * from './ValueBar';
export * from './NewValueBar';
