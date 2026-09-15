// Report generation seeds for a program order (AC-PR4): the program / period /
// customer identity that indicator report templates need in order to locate the
// program data behind the order. Handed to the Export/Print selector, which
// merges them into the report arguments.
//
// Deliberately independent of the Indicators tab gate (showIndicators):
// whether the tab is *offered* is a display decision, but a report template
// declaring $programId / $periodId / $customerNameId fails outright when they
// are absent from the arguments. The server has no "unprovided variable"
// fallback, so the whole report errors rather than rendering without
// indicators — open-msupply#12713, where an emergency program order hid the
// tab, withheld the seeds, and left `Rapport commande mensuel` ungeneratable.
// Withholding the seeds can only break such a report, never help it.
//
// Undefined when there is genuinely nothing to send — a non-program order, or
// before the store's own name id resolves. Null is not a substitute: the
// indicator value fields take String! arguments and reject it.

export type ReportSeedArgs = {
  programId: string;
  periodId: string;
  customerNameId: string;
};

export const reportSeedArgs = (
  node:
    | { program?: { id: string } | null; period?: { id: string } | null }
    | undefined,
  ownNameId: string | undefined
): ReportSeedArgs | undefined => {
  if (!node?.program || !node.period || !ownNameId) return undefined;
  return {
    programId: node.program.id,
    periodId: node.period.id,
    customerNameId: ownNameId,
  };
};
