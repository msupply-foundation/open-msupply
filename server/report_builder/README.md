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
