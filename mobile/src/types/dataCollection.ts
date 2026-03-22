export type FieldType =
  | "text"
  | "numeric"
  | "date"
  | "choice_buttons"
  | "choice_dropdown";

export const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  text: "Text",
  numeric: "Numeric",
  date: "Date",
  choice_buttons: "Choice (buttons)",
  choice_dropdown: "Choice (dropdown)",
};

export interface FieldChoice {
  label: string;
  value: string;
}

export interface DataCollectionField {
  id: number;
  screenId: number;
  label: string;
  order: number;
  type: FieldType;
  required: boolean;
  choices?: FieldChoice[];
  defaultValue?: string | null; // null = "none"
}

export interface DataCollectionScreen {
  id: number;
  order: number;
  name: string;
}

export interface DataCollectionConfig {
  screens: DataCollectionScreen[];
  fields: DataCollectionField[];
  nextId: number; // shared auto-increment counter
}

export const DEFAULT_CONFIG: DataCollectionConfig = {
  nextId: 4,
  screens: [{ id: 1, order: 1, name: "Demographics" }],
  fields: [
    {
      id: 1,
      screenId: 1,
      label: "Gender",
      order: 1,
      type: "choice_buttons",
      required: true,
      choices: [
        { label: "Male", value: "Male" },
        { label: "Female", value: "Female" },
      ],
      defaultValue: null,
    },
    {
      id: 2,
      screenId: 1,
      label: "Age Group",
      order: 2,
      type: "choice_buttons",
      required: true,
      choices: [
        { label: "0-11 months", value: "0-11 months" },
        { label: "12-23 months", value: "12-23 months" },
        { label: "24-59 months", value: "24-59 months" },
        { label: "Women", value: "Women" },
      ],
      defaultValue: null,
    },
    {
      id: 3,
      screenId: 1,
      label: "Service Mode",
      order: 3,
      type: "choice_buttons",
      required: true,
      choices: [
        { label: "Fixed", value: "Fixed" },
        { label: "Mobile", value: "Mobile" },
        { label: "Outreach", value: "Outreach" },
      ],
      defaultValue: null,
    },
  ],
};
