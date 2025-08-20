# Reports

The first part of this readme explains [basic tools](#basic-tools-and-uploading) for building and installing including [CLI tools](#cli-tools), and how to add reports to remote sites via the [ui interface](#uploading-reports).

The second part contains more detailed [development information](#report-development) such as information on [source file structuring](#report-source-files), information on [development](#development) processes, and [maintenance](#maintenance-support-info) of OMS reports.

## Overview of Reports

Reports are generated [HTML tera](#tera-templating-language) files used for a variety of reporting applications in OMS.

We have two types of reports: 'Reports' and 'Forms'.

Reports only differ from forms in that they have an addition of a JSON form input which can be used to modify queries or how data is converted.

Both reports and forms can use graphql and sql queries, use [BoaJS data conversion](#convert-data-functions), and can be used throughout the app.

OMS uses both custom and standard reports. Standard reports are generic reports which come embedded with any OMS build.

Custom reports are client specific reports. Custom reports can be added as an override to a standard report (by using the same code), or in addition to standard reports (by using a new code).

The toggle report command can be useful to deactivate standard reports when a client wants them to be hidden.

# Basic tools and uploading

## CLI Tools

### Build Reports

`build-reports --path <optional-path>`

Build reports command generates all reports into a json array.

This command builds these reports from source files within the dir passed as an argument to this command. It will attempt to build a report from any dir containing a `report-manifest.json` file. This command will search through any sub directories recursively; any file structure can be used.

If no path is passed, the build-reports command defaults to the `standard_forms` and `standard_reportd` dirs containing OMS standard forms and reports respectively.

The generated json can be added to sites via the [ui interface](#uploading-reports) or [upsert reports](#upsert-reports) cli command.

The `build-reports` command will generated all reports in all sub dirs - so can be used to generate multiple reports for a specific client, or a single specific report. Regardless if one or many reports are built, the generated json file will be of the same structure (an array of reports), and can be uploaded via cli or central server ui.

### Upsert Reports

`upsert-reports --path <optional-path> --overwrite (optional)`

Upsert reports command inserts or upserts reports from a json array located in the path passed as the `path` argument.

This command will upsert if the `-o` or `--overwrite` flag is passed.
If no overwrite flag is passed, it will default to insert.

If no path is passed, it will look for in the `reports/generated/standard-reports.json` file for the array of standard reports. 

#### Report IDs

Report IDs are generated in a standardised way in the format of `<report-code>_<report-version>_<is-custom-boolean>`.
This means an edited report of the same version will not upload without the `-o` flag.
To ensure edited reports supercede existing reports, they should have their patch version bumped as detailed in the [versioning section](#report-versioning).


### Reload Embedded Reports

`reload-embedded-reports`

This command upserts and updates oms standard reports to the current branch.

Open mSupply standard reports are embedded during building from the `reports/generated/standard-reports.json` file. Embedded reports are included in release builds, and are therefore accessible on testing builds where the OMS repo file structure is not available.

This command is used to update standard reports to the current branch in databases on live or test builds.

Building reports will automatically install any node dependencies for a specific report from that reports' package.json.

### Show Report

`show-report --path <path-to-report-dir-containing-report-manifest.json> --config <optional-path-to-dir-containing-test-config.json> --format <optional[html|excel]>`

Show report replaces previously used print.sh and show.sh bash commands on the OMS reports repo.

By default, running this command will generate and open an html file of the report. A `format` argument can be passed to generate an excel file instead.

#### Test Config

Reports need certain parameters and arguments. Copy the `test-config.example.json` file to `test-config.json` in this directory, and update it with your desired parameters.

A custom test-config.json file can be used to render with specific arguments by passing a path to a dir containing a report specific `test-config.json` file.

### Toggle Report

`toggle-report --code <report-code> --is_custom [true|false : optional] --enable (optional) --disable (optional)`

Sets the `is_active` flag on a report.

By default will toggle the `is_active` flag, swapping between true/false.

If `--enable` or `--disable` are specified, will directly set the `is_active` flag to `true` or `false` respectively.

If `--is_custom` is include, will filter the selected reports by the `is_custom` flag.

## Uploading Reports

A generated report json can be added to an OMS site via the central server ui interface, or using the [upsert command](#upsert-reports).

Reports added to OMS central server (from either cli or ui interface) are synced to remote sites.

Report versioning protects remote sites of earlier versions from rendering a more recent report of an incompatible api.

The report ui interface can be accesed via the manage nav.

Both the upsert and upload ui accept an array of generated reports from the [build reports](#build-reports) command.

# Reports Structure

## Report Source Files

Source files for each report are located in their own directory and have the following structure:

1. [report-manifest.json](#report-manifest)
2. [src dir](#src-dir)
3. (optional) [convert_data_js dir](#convert_data_js-dir)
4. (optional) [argument_schemas dir](#argument_schemas-dir)
5. (optional) [excel template](#excel)

A full tree diagram of the report source file structure can be viewed [here](#source-file-structure-diagram)

### Report Manifest

The `report-manifest.json` file contains information required to build the report.
Optional fields in the manifest json are marked as '// optional'

```json
{
  // is_custom is specified as false for standard reports and by default true for other reports.
  // custom reports will override standard reports of the same report code.
  "is_custom": false,
  // open mSupply identifies the report version from the manifest json
  "version": "2.3.0",
  // The code is the unique identifier of a report group inclusive of all versions of that report.
  // Each different version of a standard report will have the same code.
  // The code is required to identify reports of the same version where they will have different ids
  "code": "item-usage",
  // report context, see server/repository/src/db_diesel/report_row.rs
  "context": "REPORT",
  // optional
  // Sub context for reports, applicable to Dispensary and Report context, see client/packages/reports/src/ListView/ListView.tsx",
  // Currently only reports of subcontext 'Expiring' and 'StockAndItems' are displayed
  "sub_context": "StockAndItems",
  // Display name of report
  "name": "Item Usage",
  // optional
  "queries": {
    // optional
    // GraphQL file query name with extension
    "gql": "query.graphql",
    // optional
    // vec of sql query file names without extension. report_builder will parse both postgres.sql, sqlite.sql, and agnostic .sql file type extensions.
    "sql": ["thisMonthConsumption", "lastMonthConsumption"]
  },
  // optional
  "arguments": {
    // location of schema file json relative to the version dir
    "schema": "argument_schemas/arguments.json",
    // location of ui schema file json relative to the version dir
    "ui": "argument_schemas/arguments_ui.json"
  },
  // optional
  // name of dir within the version dir of the report which includes js wasm function constructors.
  "convert_data": "convert_data_js",
  // optional
  // default: Extism
  // type of convert data infrastructure, can be Extism or BoaJs. We are in the process of deprecating Extism report types as they generate a very large bundle
  "convert_data_type": "BoaJs",
  // optional
  // name of html header template of the report found within the src dir
  "header": "header.html",
  // optional
  // name of tera html footer template of the report found within the src dir
  "footer": "footer.html",
  // optional
  // location of Excel template file relative to the version dir
  "excel_template": "demo_template.xlsx"
}
```

### src dir

The src dir contains:

1. The main template file `template.html` which contains the report content. The name of this must be `template.html`.
2. Header and footer html files. The names of these are specified in the [`report-manifest.json`](#report-manifest)
3. GraphQL and sql query functions used by the report
   GraphQL query files must be named in full as seen in the example [`report-manifest.json`](#report-manifest)
   sql files are named without suffix and within an array as seen in the example [`report-manifest.json`](#report-manifest)
4. css files used to format the report

### convert_data_js dir

A javascript function can be added to reports where further data conversion is required. This functionality will be built automatically by the report build cli when a convert_data_js dir path is specified in the [`report-manifest.json`](#report-manifest)

The convert_data_js follows a typical node package structure, with `package.json` in the root, `src` directory and typescipt/packager config (`webpack` in our case). The latest example with extensive type safety is item-usage report.

For vanila JS a simple `webpack.config.js` is all that is needed. For typescript `webpack.config.js` is more involved and requires `tsconfig.json` plus extra config files and dependencies for generating types for graphql queries and json form argument schemas.

#### convert_data_js src dir

This src dir contains

1. `convert_data.|js or ts|`, which is the entrypoint file exporting convert_data method
2. optional `generated-types/` directory containing types generate by graphql queries and argument schemas
3. `test/` directory container `|input and output|.json` and `test.ts` file containing the test

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
   |   |   ├── convert_data.js (copy)
   |   |   ├── utils.js
   |   |   └── utils.test.js (optional)
   |   ├── webpack.config.js
   |   ├── input.json (optional)
   |   ├── output.json (optional)
   |   └── package.json (copy)
   ├──  src
   |   ├── footer.html (optional)
   |   ├── header.html (optional)
   |   ├── style.css
   |   ├── SQL queries (optional, and possibly multiple)
   |   ├── GraphQL query (optional)
   |   └── template.html
   └── report-manifest.json
```

### source file structure diagram with typescript functionality

```
├── example-report
   ├── argument_schemas (optional)
   │   ├── argument_ui.json
   |   └── arguments.json
   ├── convert_data_js (optional)
   │   ├── dist (generated)
   |   ├── node_modules (generated)
   |   ├── src
   |   |   ├── generated-types (generated)
   |   |   ├── test (optional)
   |   |   |   ├── input.json
   |   |   |   ├── output.json
   |   |   |   └── test.ts
   |   |   ├── convert_data.ts (copy)
   |   |   ├── utils.ts
   |   |   └── utils.test.ts (optional)
   |   ├── codegen.yaml
   |   ├── codegenTypes.ts
   |   ├── convertDataType.ts
   |   ├── jest.config.js
   |   ├── package.json
   |   ├── tsconfig.json
   |   ├── input.json (optional)
   |   ├── output.json (optional)
   |   ├── webpack.config.js
   |   └── yarn.lock (generated)
   ├──  src
   |   ├── footer.html (optional)
   |   ├── header.html (optional)
   |   ├── style.css
   |   ├── SQL queries (optional, and possibly multiple)
   |   ├── GraphQL query (optional)
   |   └── template.html
   ├── excel_template.xlsx (optional)
   └── report-manifest.json
```

## Development

Other functionality, and processes used in report development are:

[Tera templating language](#tera-templating-language)
[Translating of reports](#translating-reports)
[Standard vs custom reports]
[Report versioning](#report-versioning)
[Wasm functions](#wasm-functions)
[Development processes](#development-processes)
[File Structure](#file-structure-1)

### Tera templating language

OMS forms and reports are rendered as HTML using [Tera](https://keats.github.io/tera/docs/), an extension of HTML where values are replaced during render and simple logic can be executed.

### Excel

Reports & forms are also exportable to Excel format. This is done by parsing the HTML template and converting it to an Excel worksheet.

#### Parsable HTML templates

By default, only the main body of the report (i.e. `template.html`) is parsed to create the Excel worksheet. To be converted to Excel, this template must use HTML <table> elements.

- The `template.html` main body template should have a `<table>`
  - Then for row headers > `<thead>` > `<tr>` > `<th>`
  - And for data rows > `<tbody>` > `<tr>` > `<td>`

#### Customising the Excel export

##### Header section

The `header.html` template often includes important info (report title, date, customer etc.). Map these to the Excel sheet by using the `excel-cell` attribute.

`excel-type="title"` and `excel-type="bold"` are available for simple styling.

```html
<div>
  <h1 excel-cell="A1" excel-type="title">Report Title</h1>
  <div>
    <span excel-cell="C2" excel-type="bold">Date:</span>
    <span excel-cell="D2">{{ current_date }}</span>
  </div>
  <div>Unrelated for Excel</div>
</div>
```

would map to:

|     | A                                                     | B   | C         | D      |
| --- | ----------------------------------------------------- | --- | --------- | ------ |
| 1   | <span style="font-size: 18px">**Report Title**</span> |     |           |
| 2   |                                                       |     | **Date**: | 1/1/26 |

One blank row will be left, and then the main data table will begin. So in this case we'd start from row 4.

Note that footers are currently not supported for Excel.

##### Data rows

- `excel-table-start-row="9"` - You may have a custom header. To define where the main data table starts, add this attribute to the `<tr>` containing the table header row.
- `excel-column="A"` - To customise which columns are shown, and in which order, use the `excel-column` attribute on the `<th>` elements. This will map the data to the specified column in the Excel worksheet.
  - Note that once any columns have this attribute, all other columns will be excluded from the Excel export. If no columns have this attribute, all columns will be included.
- `excel-type="total-row"` - If your report includes a total row, add this attribute to the `<tr>` element of the total row. This ensures that the total row is rendered correctly in Excel (in bold, and after a blank row to allow for pivot tables).

e.g.

```html
<table>
  <thead>
    <tr excel-table-start-row="9">
      <th excel-column="B">Name</th>
      <th excel-column="A">Cost</th>
      <th>Total</th>
    </tr>
    <tr>
      <td>Ibuprofen</td>
      <td>$10.00</td>
      <td>$100.00</td>
    </tr>
  </thead>
</table>
```

In this case, the header row would start on row 9, and only include the Cost and Name columns (swapped around for... some reason 😁).

#### Excel template

You can also include an optional Excel template file, allowing for more complex formatting, styling and formulae to be included in the Excel export. After specifying the `excel_template` in your `report-manifest.json`, use the attributes as above to map data from the HTML template to the correct areas in the Excel template.

### Translating reports

Reports have the option to allow for translations using the same localisation suite we use for front end translations.

Translating functionality should be used in standard reports. Custom reports for specific clients typically are hard coded.

##### Translating function

This can be implemented in the report by adding the following translation function in place of your text:

```
{{t(k="label.name", f="Name")}}
```

Where the letters are short hand for the following:

- t for translate
  The name of the function
- k for key
  This is the locale key as is used in front end translations.
- f for fallback
  This is an optional fallback text if the translation cannot be found.

The current user language is passed through GraphQL when a user requests a report to be generated. This is the language used in translations.

##### Translating search pattern

The translation function has a number of fallback translations which it will search through if the translation cannot be found.

First it will fallback to the translation in the common.json namespace and nominated language
Next it will fallback to the translation in common.json namespace in the base language (if language selected is a dialect)
Next it will fallback to the english translation of the nominated key in the common.json namespace
Next it will fallback to the fallback text provided in the report which by default will be in english

If none of the above can be found, the report will fail to render.

#### Translating Argument UI Schema

Fields in UI schema can be translated using inbuilt translating function.

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

#### Translating report names

Reports are translated via the unique report code.
The translation key of the report is structured
`report.<reportcode>`

If this key does not exist in the front end common.json, the translation will fallback to the report name.

Standard reports need to have a translation key added to the common.json in the client dir of OMS.
Custom reports will use the fallback mechanism, and have client specific, human-readable name as the report name field.

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

In the case where there are custom reports, but none are compatible with the app version, the highest compatible versioned standard report will be used.

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

### Convert data functions

Sometimes we need to manipulate data for ease of templating (templating should only deal with presentation, i.e. rounding, styles etc..), for this we can use javascript methods that will run in BoaJs runtime (on the server).

These javascript methods are called convert_data, they can either be typescript or vanilla JS. Typescript will require more boilerplate code and type generations, graphql queries and argument schema can be generated by running `yarn && yarn generate-types` from within convert_data folder, note that server must be running as per codegen.yaml file which may require manual matching of ports.

Exported convert_data methods will accept all of the data that would typically be passed on to the template, it can then manipulate data and return it, manipulated data will be passed on to templating.

It's a good idea to test convert_data with realistic input and output data.

For full typescript examples with tests please see item-usage report.

> Note typescript reports often require additional dependencies which are not installed by default. You may need to navigate to the report convert_data dir and run `yarn` to allow reports to build. This may be required even if no type regeneration is needed. For example, the item-usage report will require dependency installation on a new omSupply instance before it can be built.

#### Debugging and Logging

A `log` method is injected into javascript context, and can be used to pass a log messages to the server, which in term log them at info level, i.e. `log('debug log')` will result in the following log in server console and or file log:

<details>
<summary>
Log output
</summary>

```
2025-03-06 16:52:51.149410000 [INFO ] <service::boajs::methods::log:10>:from js [
    String(
        "debug log",
    ),
]
```

</content>
</details>

Logging of object is best done with JSON.stringify inside of the log method.

#### Testing

Run `yarn test` from the 'client' directory.

Any .test files within standard report or standard forms will be checked when conducting these tests.

#### Packager and Typescript

webpack is used to package convert_data entrypoint file into a module.

Typescript convert_data package will require base types (`convertDataTypes.ts`), configuration for graphql codegen and type dependencies (`codegenTypes.ts` and `codegen.yaml`) and a typescript config (`tsconfig.json`). Also extra dependencies and generate-types script is added to package.json. Types can be generated from graphql queries and argument form json schema using `yarn generate-types` script, note the server must be running on port 8000 over http and initialised.

If common types or utilities need to be shared, they must live withing rootDir specified by tsconfig.json or copied into report.

NOTE: we can extend report infrastructure to share types, utility method and configurations between reports, however this becomes more difficult when dealing with custom reports that live in another repository, and copy paste approach should be sufficient for now, in the future a more strict folder structure similar to plugins can be used, together with adding a git submodules of custom reports repository.

### Developing Reports

#### New Report Versions

When iterating on a report, the version in the report-manifest.json needs to be bumped.

##### Latest Directory

All report directories contain a report version dir called `latest`
When making changes to a report, changes should be made in the `latest` dir source files.

Where these changes would require a major or minor version change (ie from an API change):

1. First make a copy of the `latest` dir with the name of the current major and minor version of the `latest` dir
2. Next bump the version of `latest` and make the changes that are required.

This allows reviewers to focus only on the dif of the `latest` dir.
New version dirs can easily be ignored as duplicates of the previous iteration of `latest`

It is necessary to produce all versions of each report to ensure a report is available for remote OMS sites which might not have been updated to the latest version.

Convention for file structures of report versions is:

```
└──  example-report
   ├── 2_4
   └── latest
```

Where 2_4 and latest are directories containing source files of different versions of the same report.

##### Patches

Report files can be overwritten for patch changes.
Reports of a new patch must be backwards compatible to open mSupply of the same major and minor version. Therefore we can reduce PR dif overhead, and committed file overhead in OMS, by editing a report if it is a patch change.

Previous patch versions of a report can be accessed if necessary on old branches of open mSupply.

### File Structure

#### Reports and Forms

Reports are separated into 'reports' and 'forms' (previously picklists)

##### Reports

Use argument schemas to generate filtered reports based on user input.

##### Forms

Use inbuilt constant arguments, and are not customisable with front end user inputs.

##### File Structure

The full conventional file structure is as follows:

```
├── reports
   ├──  clients
   |   ├── client 1
   |   |   ├── Reports
   |   |   |   ├── expiring-items
   |   |   |   |   ├── 2_6
   |   |   |   |   └── latest
   |   |   |   └── item-usage
   |   |   |       └── latest
   |   |   └── Forms
   |   |       ├── repack
   |   |       |   ├── 2_6
   |   |       |   └── latest
   |   |       └── requisition
   |   |           └── latest
   |   └── client 2
   |       └── Reports
   |           └── expiring-items
   |               ├── 2_6
   |               └── latest
   └── Other source files and helper functions
```

Where each 'version dir' ie 2_6 contains all the source files required to build that report as per the [source file diagram](#source-file-structure-diagram)

### Client Confidentiality

Client specific reports are confidential. Information regarding these reports must be kept out of the open-msupply repository.

When sharing databases, ensure no client information is uploaded github. Share databases and client specific information through secure channels only.

## Maintenance (support info)

The OMS CLI provides tools for managing and developing reports within an omSupply instance. It allows users to build, upsert, and test reports, streamlining the development and deployment process.

All sites will have embedded standard reports inserted on startup.

Additional reports (both custom, and patched standard reports) can be upserted in bulk to open mSupply central servers via the `upsert-reports` command.

Reports will then be synced out from there to remote sites.


## Glossary

## Decision tree

## Troubleshooting
