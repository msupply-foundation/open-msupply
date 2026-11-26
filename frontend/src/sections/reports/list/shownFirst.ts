// Which reports a Reports page category lists before the user presses its
// Show more (spec/reports rules § which reports a store sees first,
// OMS-REG-RPT-07.15–.17). The server decides `isDisplayed` for the store; the
// page only splits the list it already fetched.

/** The reports to list: every one once expanded, otherwise the displayed. */
export const shownReports = <T extends { isDisplayed: boolean }>(
  reports: readonly T[],
  expanded: boolean
): T[] => (expanded ? [...reports] : reports.filter(r => r.isDisplayed));

/** How many reports Show more would add — the N in "Show N more". */
export const hiddenReportCount = (
  reports: readonly { isDisplayed: boolean }[]
): number => reports.filter(r => !r.isDisplayed).length;
