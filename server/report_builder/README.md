# Report builder
The report builder is a helper utility for generating report template definition files.
Report template definition files are json files containing all information required by the remote-server to produce a data report.

Editing the template definition json file directly would be quite cumbersome.
The report builder aids the template designer to create the template definition file from a more convenient project structure, e.g. from a flat directory of Tera html templates and css files.
The report builder also helps to test/print template definition file locally.

To summaries, the report builder has two functionalities:
1) **Build** a report template which can be uploaded straight to the central server
2) **Print** a report template, e.g. to test a report template during development before uploading it.

## Project directory
The report builder expects files to be in a flat directory (no sub directories are currently supported).
The `example` directory contains an example project.
In this example, the `example/template.html` file is the main entry point for the report.
It contains various examples and details on how to use various aspects of the template system, e.g. how to include other file, how include images or how to convert dates to the local timezone.

There are three main template entry points:
1) The main template file (e.g. `example/template.html`) which contains the report content
2) An optional header template file to specify the report header (e.g. `example/header.html`)
3) An optional footer template file to specify the report footer (e.g. `example/footer.html`)

All files in the project dir should be text files.
The reason for this is that all files will be bundled into a single json template definition file and, for this to work, binary files such as images needs to be encoded in base64.

### Special file types:
- **`*.graphql` files:**
A `*.graphql` file is used to specify a custom data query and must explicitly included through a command line argument (see usage section).
Files ending `*.graphql` are not directly included into the report definition.

- **`*.json` files:** 
Json files can contain some other information that can be accessed in the Tera template (through the `res` object, see example dir).
For example, instead of hard coding the timezone, as done in the example, the timeszone string could also stored in a json data file.


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
``` bash
# Build a report definition template 
> report_build build
# Print a report definition template
> report_build print
```

### Build a report template definition
For example, to build the example template including header and footer using the default stocktake query:

``` bash
> report_build build --dir path/to/project --template template.html --header header.html --footer footer.html --query-default stocktake
```

To use a custom query instead, do:

``` bash
> report_build build --dir path/to/project --template template.html --header header.html --footer footer.html --query-gql query.graphql
```

On default this will create an `output.json` template definition file which can be uploaded to the central server.
(The output path can be configure using `--output` argument)

### Print a report template definition
To print a report definition template a running remote-server is required.
Moreover, report_build requires config details for how to access the remote-server.
To provide this information create a config file, e.g. `config.yaml`:
```yaml
url: "https://demo-open.msupply.org:8000"
username: "username"
password: "password"
```

The report builder will use this config file to authenticate with the remote-server and print/download the report to the local file system.
The remote-server needs a store id and a data id to print the report.
For example, to print a report for a stocktake with id "d734fd45-064e-4ddd-9886-ea71a2797640" from store "80004C94067A4CE5A34FC343EB1B4306":

``` bash
> report_build print --report output.json --config config.yaml --store-id 80004C94067A4CE5A34FC343EB1B4306 --data-id d734fd45-064e-4ddd-9886-ea71a2797640 --name report_pdf_name
```


## References to other template definitions (not supported in the report builder yet) 
It's possible to refer to other template resources that already exist on the server, e.g. to refer to a common headers or icons.

Please request if needed...
