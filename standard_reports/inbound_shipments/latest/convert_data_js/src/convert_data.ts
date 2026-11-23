import { Input, Output } from "./types";
import { processInvoiceLines } from "./utils";

function convert_data(res: Input): Output {
  const result = processInvoiceLines(
    res?.data?.invoices,
  );

  // The template prints dates in arguments.timezone, so pass the arguments on
  return { ...result, arguments: res?.arguments };
}

export { convert_data };
