import { RequestLineFragment } from "./RequestRequisition/api";

export type RequestItem = {
    id: string;
    itemId: string;
    lines: RequestLineFragment[];
  };