import { Input, Output } from "./types";
import { crosstab } from "./utils";

function convert_data(res: Input): Output {
  return {
    arguments: res.arguments,
    data: crosstab(res.data?.itemsByName ?? [], res.arguments?.show),
  };
}

export { convert_data };
