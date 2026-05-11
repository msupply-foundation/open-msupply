import { Input, Output } from "./types";
import { processInvoiceLines } from "./utils";

function convert_data(res: Input): Output {
  const result = processInvoiceLines(
    res?.data?.invoices,
  );

  return result;
}

export { convert_data };
