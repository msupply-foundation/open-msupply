# Reports

This repository contains source files for standard reports. Command-line interface (CLI) tools for generating reports, processing data, and upserting reports to OMS databases. 

This readme contains information on [source file structuring](#report-source-files), report related [CLI tools](#cli-tools), information on [development](#development) and [maintenance](#maintenance) of OMS reports.

## Report Source Files

Source files for each report are located in their own directory. Within this directory are:

1. [report-manifest.json](#report-manifest)
2. [src dir](#src-dir)
3. (optional) [convert_data_js dir](#convert_data_js-dir)
4. (optional) [argument_schemas dir](#argument_schemas-dir)

A full tree diagram of the report source file structure can be viewed [here](#source-file-structure-diagram)

### report-manifest

The `report-manifest.json` contains information required to build the report detailed below.
Optional fields in the manifest json are marked as '// optional'

```json
{
  // is_custom is specified as false for standard reports and by default true for other reports.
  // custom reports will override standard reports of the same report code.
  "is_custom": false,
  // open mSupply needs to know the report version
  "version": "2.3.0",
  // The code is the unique identifier of a report group inclusive of all versions of that report.
  // Each different version of a standard report will have the same code.
  // The code is required to identify reports of the same version where they will have different ids
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
  },
  // optional
  // path to custom wasm data conversion function. Having a path to a custom function allows users to generate a function from a language other than JS
  "custom_wasm_function": "path to cusom wasm function",
  // optional
  // name of dir within the version dir of the report which includes js wasm function constructors.
  "convert_data": "convert_data_js",
  // optional
  // name of html header template of the report found within the src dir
  "header": "header.html",
  // optional
  // name of html footer template of the report found within the src dir
  "footer": "footer.html"
}
```

### src dir

The src dir contains:
1. The main template file `template.html` which contains the report content. The name of this must be `template.html`
2. Header and footer html files. The names of these are specified in the [`report-manifest.json`](#report-manifest)
2. graphql and sql query functions used by the report
Graphql query files must be named in full as seen in the example [`report-manifest.json`](#report-manifest)
sql files are named without suffix and within an array as seen in the example [`report-manifest.json`](#report-manifest)
3. css files used to format the report

### convert_data_js dir

A extism plugin function can be added to reports where further data conversion is required. This functionality will be built automatically by the report build cli when a convert_data_js dir path is specified in the [`report-manifest.json`](#report-manifest)

The convert_data_js dir contains
1. generated `dist` and `node_modules` dirs. These should not be edited and are generated automatically.
2. `esbuild.js` and `package.json` files. These are identical for all reports and should be copied without editing.
3. Optional `input.json` and `output.json` files used to validate tests where tests are added to validate data conversion functionality
4. src dir containing data conversion functions.

#### convert_data_js src dir

This src dir contains
1. convert_data.d.ts and. This is identical for all reports and should be copied without editing
2. convert_data.js file. This should be identical and copied directly as all data processing should be done in the utils.js file. However some changes may be required here to pass the correct data structure.
3. utils.js file containing all data conversion and processing
4. Optional utils.test.ts file for validating data conversion

### argument_schemas dir

Argument schemas are used to present a JSON form on the front end for filter and other parameter input used to customise a report during render.

This dir contains
1. arguments_ui.json
2. arguments.json

These files must be compliant with JSON forms.

### source file structure diagram

```
├── example-report
   ├── argument_schemas (optional)
   │   ├── argument_ui.json
   |   └── arguments.json
   ├── convert_data_js (optional)
   │   ├── dist (generated)
   |   ├── node_modules (generated)
   |   ├── src
   |   |   ├── convert_data.d.ts (copy)
   |   |   ├── convert_data.js (copy)
   |   |   ├── utils.js 
   |   |   └── utils.test.js (optional)
   |   ├── esbuild.js (copy)
   |   ├── input.json (optional)
   |   ├── output.json (optional)
   |   └── package.json (copy)
   ├──  src
   |   ├── footer.html (optional)
   |   ├── header.html (optional)
   |   ├── style.css
   |   ├── sql queries (optional, and possibly multiple)
   |   ├── graphql query (optional)
   |   └── template.html
   └── report-manifest.json
```

## CLI Tools

Command line interface tools used in development and maintenance of reports are:

### Build Reports

`build-reports --path <optional-path>`

Build reports command generates all reports into a json array. 

It builds these reports from source files within the dir passed as an argument to this command. It will attempt to build a report from any dir containing a `report-manifest.json` file. Any file structure can be used as this command will search recursively through the directories.

If no path is passed, the build-reports command defaults to the `reports` dir containing OMS standard reports.

### Upsert Reports

`upsert-reports --path <optional-path> --overwrite (optional)`

Upsert reports command inserts or upserts reports from a json array located in the path passed as the `path` argument.

This command will upsert if the `-o` or `--overwrite` flag is passed.
If no overwrite flag is passed, it will default to insert.

If no path is passed, it will look for in the `reports/generated/standard-reports.json` file for the array of standard reports.
This file is a committed file.

### Reload Embedded Reports

`reload-embedded-reports`

This command upserts and updates oms standard reports to the current branch.

Open mSupply standard reports are embedded during building from the `reports/generated/standard-reports.json` file. Embedded reports are included in release builds, and are therefore accessible on testing builds where the OMS repo file structure is not available.

This command is used to update standard reports to the current branch in databases on live or test builds.

### Show Report

`show-report --path <path-to-report-dir-containing-report-manifest.json> --config <optional-path-to-dir-containing-test-config.json>

Show report replaces previously used print.sh and show.sh bash commands on the OMS reports repo.

Running this command will generate and open an html file of the report.

This command uses a `test-config.json` file located in the reports dir containing all arguments used to generate the report.

A custom test-config.json file can be used to render with specific arguments by passing a path to a dir containing a report specific `test-config.json file`

## Development

Other functionality, and processes used in report development are:

[Translating of reports](#translating-reports)
[Standard vs custom reports]
[Report versioning](#report-versioning)
[Wasm functions](#wasm-functions)
[Development processes](#development-processes)
[File Structure]

### Translating reports

Reports have the option to allow for translations using the same localisation suite we use for front end translations.

Translating functionality should be used in standard reports. Custom reports for specific clients typically are hard coded.

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
- f for fallback
  This is an optional fallback text if the translation cannot be found.
- n for namespace
  The file namespace where the translation key is. The .json extention is automatically added ie catalogue (which refers to the catalogue.json namespace).
  By default, the translation in common.json translations will be used.
  Note all translation files have been consolidated into the common.json namespace, so the namespace parameter is no longer user. However, functionality is retained in case we are needing customer specific namespaces in future.
  If a specific namespace needs to be called, you can add this 'n' key into your function.

```
    {{t(k="label.name", n="catalogue", f="Name")}}
```

The current user language is passed through graphql when a user requests a report to be generated. This is the language used in translations.

The translation function has a number of fallback translations which it will search through if the translation cannot be found.

First it will look for the translation key within the nominated namespace and language
Next it will fallback to the translation in the common.json namespace and nominated language
Next it will fallback to the english translation of the nominated key and nominated namespace
Next it will fallback to the english translation of the nominated key in the common.json namespace
Next it will fallback to the fallback text provided in the report which by default will be in english

If none of the above can be found, report will fail to render.

#### Translating Argument UI Schema

Fields in UI schema can be translated our inbuilt translating function.

Translations are invoked by adding by adding a identifying text key `T#` before a value in the json or ui schema.
A translating function will step through the serialised json Value searching instances of this identifier. It will then strip it from the string, and translate the remaining string value.

For example:

```
{
"key": "T#label.value"
}
```

becomes

```
{
"key": "value"
}
```

Where value is the translated value of 'label.value' in our `common.json` translation json in the front end.

The "label" of the ui schema controls the text displayed in the front end report filtering modal.

This function could also be used on any other serialised json value such as patient json schema.

### Standard and Custom Reports

Reports are separated into standard and custom reports.

Standard reports are included in the OMS repo, and all source files are committed.

Custom reports, which can contain client specific data, are located in the private open-msupply-reports repo. This is to ensure confidentiality

Standard reports are upserted into the database on startup.
The committed json file `standard-reports.json` includes all standard reports, and all versions of each report. 

Otherwise the `open-msupply` standard reports, and `open-msupply-reports` custom reports function in the same way. They can both be built and upserted as a json array using OMS [CLI tools](#cli-tools).

### Report versioning

Reports include a version parameter to control what reports are used and displayed by the front end.
Report use is controlled by `version` and `code` parameters. One report will be presented by the front end per code.
For a given code, priority is given first to custom reports of a code, and then standard reports if no custom reports exist. The report with the latest compatible version will be used for each report code.
Version compatibility is measured by being less than or equal to the app major and minor version. Reports with the same major and minor versions but later patch versions are considered compatible with the app.

> eg: 2.4.12 version report will be compatible with a 2.4.2 app. But a 2.5.0 report will not be compatible.

In the case where there are custom reports, but none are compatible with the app version, the highest compatibly versioned standard report will be used.

This system allows OMS to have multiple reports upserted (and later synced) to distributed instances of different versions, and be able to function with compatible reports.

A report can be built as custom by editing the report-manifest.json to:

```json
"is_custom": true
```

<!-- For example:

for report_versions = [2.3.0, 2.3.5, 2.8.2, 2.8.3, 3.0.1, 3.5.1]
if remote omSupply.version = 2.3 selected report = 2.3.5
if remote omSupply.version = 2.4 selected report = 2.3.5
if remote omSupply.version = 2.8 selected report = 2.8.3
if remote omSupply.version = 3.2 selected report = 3.0.1
if remote omSupply.version = 4.5 selected report = 3.5.1 -->

### Wasm functions

Report generations includes the ability to use custom wasm functions to further extend and customise data.
OMS includes building of JS wasm functions by adding a [convert_data_js](#convert_data_js-dir) dir in the report dir.

See [the extism-js docs](https://github.com/extism/js-pdk) for more details on how to build wasm functions with js within OMS.

`make sure extism-js version 1.3.0 and above is installed`, otherwise you may get `uncreacheable error` as per this [comment](https://github.com/msupply-foundation/open-msupply/issues/5312#issuecomment-2489548208)

Alternatively wasm functions can be built externally using any compatible language using extism-PDK ([see wasm docs for more details](https://webassembly.org/getting-started/developers-guide/)), and added as a custom wasm function.

> Note custom wasm data functions will be used if both custom functions and JS wasm function builder files are both specified

#### Logging in wasm functions

Console errors, infos, and logs in wasm functions are propagated up into the server under a info! macro callback. These can be saved to file, or logged to the server terminal for easy debugging.

Log destination is configured in the `base.yaml` file under logging.

### Development processes

Creating a new report generates a large dif and can be difficult to review and test.

#### sub-pr

To reduce PR review overhead when making a new major or minior version of a report, it is encouraged to first make a sub pull request duplicating the report source files.

This duplication can be quickly validated.

A subsequent PR with changes to these source files is easier to review by identifying only relevant changes.

#### patch overwriting

The simplest way is to:

- Copy the version dir of the report you want to make a custom or new standard report for, and paste it into the same location.
- Bump the version number
- Change the version dir name to match the version number.
- Change the is_custom boolean to true if the report will be a custom report.

> The dir names are for developer convenience only. The name and version of each report read by omSupply is from the report-manifest.json file.

New report versions must be compatible with the matching major and minor versions of the OMS app.



## Maintenance

The OMS CLI provides tools for managing and developing reports within an omSupply instance. It allows users to build, upsert, and test reports, streamlining the development and deployment process.



## Report tools show command

Reports can be rendered during development using the show command

```bash
./target/debug/remote_server_cli show-report --path <path-to-your-report-dir> --config <config-file-path>
```

This command will render an html in the open mSupply directory. 
The `path` argument is mandatory. It is the path to the dir of the source file of your report. This is the dir that contains 'report-manifest.json'

The report is rendered using the 'test-config.json' file located in the reports dir.
A custom test-config file can be used if a report needs special parameters such as arguments (from json schema) added.
`config` is an optional argument to the `show-reports` command. This is a path to a custom test-config file. If no config argument is supplied, the default test-config file is used.

The config file uses the following structure:

```json
{
    "//": "For forms it's entity id",
    "data_id": "a109bb20-da6c-4d7a-a876-b0b06ffe9e91",
    "store_id": "D0E298893F3945DABE80B138E25D3D15",
    "//": "Login details",
    "url": "http://localhost:8000",
    "username": "admin",
    "password": "pass",
    "//": "Arguments for standard reports",
    "arguments": {},
    "//": "Locale to generate report. Defaults to en",
    "locale": "",
    "//": "Output file name",
    "output_filename": "report_to_show"
}
```

- data_id and store_id are the data and store id parameters used in whatever graphql query is being used to generate a report.
- url is the server url from where the report will be generated
- username and password are the login details which must authenticate with the store being accessed.
- arguments are optional additional parameters which are typically supplied through the argument JSON form in the front end. These can be edited to render specific cases of a given report

### Pull Requests with show command

Pull requests with reports should be made as easeful as possible for the reviewer. The show command can be a helpful tool in this case.

When making a PR with a custom report, add supplimentary oms data files (and custom test-config file if required) to the PR. This will allow a reviewer to immediately display the report.

#### Pull requests with small iterations on a report

When making a pull request for a new version of a report, large difs can make reviewing difficult.

For this reason, it is easier for the reviewer if a preliminary PR is made first with the duplication of all files in a new report version, and a subsequent PR is made with the files changes. This provides a dif with only the relevant changes to the reviewer.
