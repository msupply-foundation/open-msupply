# Report builder

The report builder is a helper utility for generating report template definition files.
Report template definition files are json files containing all information required by the remote-server to produce a data report.

Editing the template definition json file directly would be quite cumbersome.
The report builder aids the template designer to create the template definition file from a more convenient project structure, e.g. from a flat directory of Tera html templates and css files.
The report builder also helps to test/print template definition files locally.

To summarise, the report builder has two functions:

1. **Build** a report template which can be uploaded straight to the central server
2. **Print** a report template, e.g. to test a report template during development before uploading it.

## Project directory

The report builder expects files to be in a flat directory (no sub directories are currently supported).
The `example` directory contains an example project.
In this example, the `example/template.html` file is the main entry point for the report.
It contains various examples and details on how to use various aspects of the template system, e.g. how to include other file, how include images or how to convert dates to the local timezone.

There are three main template entry points:

1. The main template file (e.g. `example/template.html`) which contains the report content
2. An optional header template file to specify the report header (e.g. `example/header.html`)
3. An optional footer template file to specify the report footer (e.g. `example/footer.html`)

All files in the project dir should be text files.
The reason for this is that all files will be bundled into a single json template definition file and, for this to work, binary files such as images needs to be encoded in base64.
For example, an image could be encoded using a tools like:
http://jpillora.com/base64-encoder/
which generates a data URI (https://en.wikipedia.org/wiki/Data_URI_scheme) which can be used straight in `<img>` `src` tags (see example project).
Note: don't upload sensitive data to online encoders.

### Special file types:

- **`*.graphql` files:**
  A `*.graphql` file is used to specify a custom data query and must explicitly included through a command line argument (see usage section).
  Files ending `*.graphql` are not directly included into the report definition.

- **`*.json` files:**
  Json files can contain some other information that can be accessed in the Tera template (through the `res` object, see example dir).
  For example, instead of hard coding the timezone, as done in the example, the timeszone string could also stored in a json data file.

- **`manifest.json`**
  Manifest file to specify various report metadata.
  The manifest file is added to the `res` object as a normal resource and thus can be accessed from within the Tera template.
  The manifest file must have the following structure:

```ts
// manifest.json
{
  // Report context type
  "context": "PATIENT" | "DISPENSARY" | ...
}
```

## Usage

To build the report builder from the Rust source code run the following command in the `report_builder` directory:

```bash
> cargo build
# or
> cargo build --release
```

Alternatively you can also just run it from the project dir

```bash
> cargo run -- {builder args go here}
```

There are two sub commands:

```bash
# Build a report definition template
> report_builder build
# Print a report definition template
> report_builder print
```

To see a full list of command line argument options use the `--help` flag:

```bash
> report_builder build --help
# Print a report definition template
> report_builder print --help
```

### Build a report template definition

For example, to build the example template including header and footer using the default stocktake query:

```bash
> report_builder build --dir path/to/project --template template.html --header header.html --footer footer.html --query-default stocktake
```

To use a custom query instead, do:

```bash
> report_builder build --dir path/to/project --template template.html --header header.html --footer footer.html --query-gql query.graphql
```

On default this will create an `output.json` template definition file which can be uploaded to the central server.
(The output path can be configured using `--output` argument)

### Print a report template definition

To print a report definition template a running remote-server is required.
Moreover, report_builder requires config details for how to access the remote-server.
To provide this information create a config file, e.g. `config.yaml`:

```yaml
url: "https://demo-open.msupply.org"
# standard omSupply username and password
username: "username"
password: "password"
```

The report builder will use this config file to authenticate with the remote-server and print/download the report to the local file system.
The remote-server needs a store id (or store name) and a data id to print the report.
For example, to print a report for a stocktake with id "d734fd45-064e-4ddd-9886-ea71a2797640" from store "80004C94067A4CE5A34FC343EB1B4306":

```bash
> report_builder print --report generated/output.json --config config.yaml --store-id 80004C94067A4CE5A34FC343EB1B4306 --data-id d734fd45-064e-4ddd-9886-ea71a2797640 --output report_pdf_name.pdf
```

If the store name instead of the store id is provided, the matching store id is automatically fetched from the central server.
For example, the following works as well:

```bash
> report_builder print --report generated/output.json --config config.yaml --store-name "Gryffindor District Store" --data-id d734fd45-064e-4ddd-9886-ea71a2797640 --output report_pdf_name.pdf
```

### Report templates with arguments

Some reports need additional arguments such as a time range.
Report arguments are passed on as variable to the used GraphGl query.

There is an example for a report with arguments in the `example_arguments` directory.
To specify the arguments create a `arguments.json` file in the `report_builder` directory with the content:

```json
{
  "creationDatetimeBeforeOrEqual": "2023-01-16T01:35:39.770Z"
}
```

The required arguments are the same as the variables one would pass to the underlying GraphGl query,
i.e. to learn about available parameters and types please look at the GraphGl query definition.

To build the report run:

```bash
report_build -- build --dir ./example_arguments/ --template template.html --query-gql query.graphql
report_build -- print --report generated/output.json --config config.yaml --store-id 80004C94067A4CE5A34FC343EB1B4306 --arguments-file ./arguments.json --output report_pdf_name.pdf
```

## References to other template definitions

It's possible to refer to other template resources that already exist on the server, e.g. to refer to a common headers or icons.

To refer to a resource from an existing report add a reference file like `icon1.ref.json` to the project with the content:

```json
{
  "source": "existing_report_id"
}
```

The existing report must contain an entry of name `icon1`.
The template entry `icon1` can then be used in the Tera templates the same as any other entry.

If there is a name conflict it is possible to rename referred template entries.
For example, instead of `icon1` an alternative name can be used by using a reference file like `my_icon_name.ref.json`:

```json
{
  "source": "existing_report_id",
  "sourceName": "icon1"
}
```

The entry `icon1` from the existing report can then be used under the name `my_icon_name`.

## Translating reports

Reports now have the option to allow for translations using the same localisation suite we use for front end translations.

This can be implemented in the report by adding the following translation function in place of your text:

```
{{t(k="label.name", f="Name")}}
```

By default,

Where the letters are short hand for the following:

- t for translate
  The name of the function
- k for key
  This is the locale key as is used in front end translations.
- n for namespace
  The file namespace where the translation key is. The .json exention is automattically added ie catalogue (which refers to the catalogue.json namespace).
  By default, the translation in common.json translations will be used. If a specific namespace needs to be called, you can add this 'n' key into your function.
  ```
      {{t(k="label.name", n="catalogue", f="Name")}}
  ```
- f for fallback
  This is an optional fallback text if the translation cannot be found.

The current user language is passed through graphql when a user requests a report to be generated. This is the language used in translations.

The translation function has a number of fallback translations which it will search through if the translation cannot be found.

First it will look for the translation key within the nominated namespace and language
Next it will fallback to the translation in the common.json namespace and nominated language
Next it will fallback to the english translation of the nominated key and nominated namespace
Next it will fallback to the english translation of the nominated key in the common.json namespace
Next it will fallback to the fallback text provided in the report which by default will be in english

If none of the above can be found, report will fail to render.

# Standard Reports

Builds 2.3.0 and above will include standard reports embedded in the binary. The 2.3.0 build includes the following reports:

- Invoice Landscape
- Item Usage
- Stock Detail
- Stock Status
- Expiring Items

Standard reports are upserted into the database on startup.
These are built and added from the standard_reports.json file in reports/generated. This json file includes all standard reports, and all versions of each report.

## Building standard reports

Standard reports are built from html, css, and query files in the same way as from the reports repo with some differences:

Standard reports include a manifest.json file which will include details of how the report is constructed:

```json
{
  // is_custom is specified as false for standard reports and by default true for other reports.
  // custom reports will override standard reports of the same code.
  "is_custom": false,
  // open mSupply needs to know the report version
  "version": "2.3.0",
  // Each different version of a standard report will have the same code. This is the unique identifier for each standard report.
  "code": "item-usage",
  // report context, see server/repository/src/db_diesel/report_row.rs
  "context": "REPORT",
  // optional
  // Sub context for reports, applicable to Dispensary and Report context, see client/packages/reports/src/ListView/ListView.tsx",
  // Currently only reports of subcontext 'Expiring' and ' StockAndItems' are displayed
  "sub_context": "StockAndItems",
  // Display name of report
  "name": "Item Usage",
  // optional
  "queries": {
    // optional
    // graphql file query name with extension
    "gql": "query.graphql",
    // optional
    // vec of sql query file names without extension. report_builder will parse both postgres.sql, sqlite.sql, and agnostic .sql file type extensions.
    "sql": ["thisMonthConsumption", "lastMonthConsumption"]
  },
  // optional
  "arguments": {
    // optional
    // location of schema file json relative to the version dir
    "schema": "argument_schemas/arguments.json",
    // optional
    // location of ui schema file json relative to the version dir
    "ui": "argument_schemas/arguments_ui.json"
  }
}
```

This manifest.json file takes the place of cli param inserts seen in bash scripts such as upsert.sh in the open-mSupply-reports repo.

Standard reports in the reports dir can be built into the generated json by running

```bash
./target/debug/remote_server_cli build-standard-reports
```

from the open-msupply/server dir.

## Standard reports versioning

Standard reports include versions for updates of reports. open mSupply central will automatically sync the most recent standard report compatible with the remote site build of open mSupply.

First open mSupply will check for custom reports of the same code which will override any standard report.
open mSupply central will then sync to the remote site the most recent minor version which matches the major version of the remote site.
For example:

for report_versions = [2.3.0, 2.3.5, 2.8.2, 2.8.3, 3.0.1, 3.5.1]
if remote omSupply.version = 2.3 selected report = 2.3.5
if remote omSupply.version = 2.4 selected report = 2.3.5
if remote omSupply.version = 2.8 selected report = 2.8.3
if remote omSupply.version = 3.2 selected report = 3.0.1
if remote omSupply.version = 4.5 selected report = 3.5.1

### Adding a new standard report version

Add a new version dir within the name of the report you are adding a new version to.

> Note that the dir names are for developer convenience only. The name and version of each report read by omSupply is from the manifest.json file.

## Developing standard reports

Standard reports can be modified and tested within the open-msupply-reports repo.

Once changes are satisfactory, new reports can be moved directly into the OMS repo under a new version dir.

Note that reports won't show up in OMS unless they are built into the generated json using the build command.
