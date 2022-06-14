import { UISchemaElement, JsonSchema } from '@jsonforms/core';

// If we add our own properties to "uiSchema", list them here for correct typing
interface UISchemaElementPlus extends UISchemaElement {
  renderer: string;
}

/*
TESTERS 
*/

// Same as JsonForms "Tester", but takes extended UI element
type TesterPlus = (
  uischema: UISchemaElementPlus,
  schema: JsonSchema,
  rootSchema: JsonSchema
) => boolean;

// Compares against uiSchema "renderer" property, a custom property
const uiRendererIs =
  (expected: string): TesterPlus =>
  (uischema: UISchemaElementPlus): boolean =>
    uischema.renderer === expected;

/*
RANKED TESTERS 
*/

// Same as JsonForms "rankWith", but takes extended UI element as above
export const rankWithEnhanced =
  (rank: number, tester: TesterPlus) =>
  (
    uischema: UISchemaElementPlus,
    schema: JsonSchema,
    rootSchema: JsonSchema
  ): number => {
    if (tester(uischema, schema, rootSchema)) {
      return rank;
    }

    return 0;
  };

// Example usage:
export default rankWithEnhanced(5, uiRendererIs('msupply'));
