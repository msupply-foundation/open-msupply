import type { IssueWarning } from '../../../../domain/allocation';

// The line editor's inline warning banners, as message descriptors the editor
// resolves via t()/formatNumber (spec/stock-allocation § reporting, AC-AL2/AL3).
// Derived from the shared deriveIssueWarnings output: over-allocation surfaces
// (AC-AL3) and EACH skipped category maps to its own banner — on-hold /
// expired / unusable-VVM (AC-AL2), never collapsed into one. The shortfall is
// surfaced separately (the placeholder notice), so it produces no banner here.
export type IssueWarningMessage =
  | { key: 'messages.over-allocated'; quantity: number; issueQuantity: number }
  | { key: 'messages.stock-on-hold' }
  | { key: 'messages.stock-expired' }
  | { key: 'messages.stock-unusable-vvm' };

export const issueWarningMessages = (
  derived: readonly IssueWarning[],
  requestedUnits: number
): IssueWarningMessage[] =>
  derived.flatMap((warning): IssueWarningMessage[] => {
    switch (warning.kind) {
      case 'over-allocated':
        return [
          {
            key: 'messages.over-allocated',
            quantity: requestedUnits + warning.units,
            issueQuantity: requestedUnits,
          },
        ];
      case 'skipped-barred':
        return warning.reasons.map((reason): IssueWarningMessage => {
          switch (reason) {
            case 'on-hold':
              return { key: 'messages.stock-on-hold' };
            case 'expired':
              return { key: 'messages.stock-expired' };
            case 'unusable-vvm':
              return { key: 'messages.stock-unusable-vvm' };
          }
        });
      case 'shortfall':
        return [];
    }
  });
