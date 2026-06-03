// Custom k6 metrics shared across the harness.
//
// A single `gql_op_duration` Trend is sliced by `{op:...}` / `{category:...}` tags in thresholds
// (config.js) — this keeps the threshold map the single source of truth for SLOs rather than
// exploding into a metric per operation.
import { Trend, Rate, Counter } from 'k6/metrics';

// GraphQL response time per operation (time=true → reported in ms).
export const gqlOpDuration = new Trend('gql_op_duration', true);

// Fraction of GraphQL calls that failed (transport errors[] OR union *Error OR http/parse).
export const gqlErrors = new Rate('gql_errors');

// Raw count of GraphQL failures, tagged with the failure `kind` for breakdown.
export const gqlErrorCount = new Counter('gql_error_count');
