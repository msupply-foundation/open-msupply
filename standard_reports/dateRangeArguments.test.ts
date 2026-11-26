import fs from 'fs';
import path from 'path';

// A date-only "To" control on a date-time argument is sent as an instant. Without
// `dateAsEndOfDay` it is midnight at the start of the chosen day, so the report
// leaves out everything later that day and a one-day range comes back empty
// (#2198, open-msupply#10703, open-msupply#10005). A "To" control is a date-only
// control with a `min`: the From date it can't go before.

type Control = {
  type?: string;
  scope?: string;
  options?: Record<string, unknown>;
  elements?: Control[];
};

const controls = (element: Control): Control[] => [
  element,
  ...(element.elements ?? []).flatMap(controls),
];

// The schema's definition of a property, wherever its `properties` block sits
// (top level or under `definitions`)
const findProperty = (
  schema: unknown,
  name: string
): Record<string, unknown> | undefined => {
  if (!schema || typeof schema !== 'object') return undefined;
  const properties = (schema as { properties?: Record<string, unknown> })
    .properties;
  if (properties?.[name]) return properties[name] as Record<string, unknown>;
  for (const value of Object.values(schema)) {
    const found = findProperty(value, name);
    if (found) return found;
  }
  return undefined;
};

const readJson = (file: string) => JSON.parse(fs.readFileSync(file, 'utf8'));

const toDateControls = fs
  .readdirSync(__dirname)
  .map(report => path.join(__dirname, report, 'latest', 'argument_schemas'))
  .filter(dir => fs.existsSync(path.join(dir, 'arguments_ui.json')))
  .flatMap(dir => {
    const schema = readJson(path.join(dir, 'arguments.json'));
    const ui = readJson(path.join(dir, 'arguments_ui.json'));
    const report = path.basename(path.dirname(path.dirname(dir)));
    return controls(ui)
      .filter(control => control.options?.dateOnly && control.options?.min)
      .map(control => {
        const property = control.scope?.split('/').pop() ?? '';
        return {
          report,
          property,
          dateTime: findProperty(schema, property)?.format === 'date-time',
          dateAsEndOfDay: control.options?.dateAsEndOfDay === true,
        };
      })
      .filter(({ dateTime }) => dateTime);
  });

describe('date range report arguments', () => {
  it('finds the reports with a To date', () => {
    expect(toDateControls.length).toBeGreaterThan(0);
  });

  it.each(toDateControls)(
    '$report: $property runs to the end of the chosen day',
    ({ dateAsEndOfDay }) => {
      expect(dateAsEndOfDay).toBe(true);
    }
  );
});
