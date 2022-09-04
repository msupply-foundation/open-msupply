# Programs module overview

The program module supports doctors or practitioners to record medical patient data, to manage patients and to do patient related data reporting.
A medical `program` focuses on the treatment of a medical condition and a patient can be enrolled in one or more programs.

All program related data is recorded in `documents` which resemble physical forms.
For example, there are currently three main document types:

1. The `Patient` document records general patient information such as name, address or age.
   The Patient document is shared between all programs of a patient.
2. The `Program Enrolment` document holds patient specific information about a single program the patient is enrolled in.
3. `Program Encounter` documents record data about a patients visit at a doctor.
   Each program encounter is associate with a single program and there is an encounter document for every visit.

What data is stored in the documents is widely customizable and its possible to add new custom document types.
This makes the system customizable to fullfil the needs of different clients.
For example, what data is recorded or how data is displayed and edited can be defined by the client.

## Practitioner driven data recording

In general data recording is driven by the practitioner.
For example, the practitioner has to explicitly change a patient's data rather than the patient data is indirectly updated based on some defined logic.
This also means that the practitioner is responsible for inputting data correctly and no inadvertently side effects interfere with the practitioner's intentions.

## Program Events

While practitioners are the main driver for entering data there are certain use-cases where data is set in a predefined way.
Currently this is done using program `events`.
Events are stored in the document but are filled automatically (by the UI form controls while editing a form).
For example, an encounter is labeled depending on the entered data.
Events are currently used for the following purposes:

1. Based on the dispensed pill count encounter, two events are scheduled in the future to change the status to "treatment interrupted" or "lost"
2. Based on the encounter fields being set or not, an encounter is labeled as "Pending Lab Report" or "Lap Report Received"

Program events have a context field which describes where the events belong, e.g. events can be scheduled from a DemoEncounter but be in the DemoProgram context.
Moreover, events can be grouped within a context.
This is useful when updating events since it makes it easier for the a UI control to replace the correct events.

When updating a document (currently only encounters documents) the backend extract events from the document and put these events it into a `program_event` table.
Events from previous encounter document versions are removed or replaced in this process.
This table can, for example, be queried to find the currently active encounter or program status, i.e. querying the status events that are not scheduled in the future.

# Documents

The core building block to store medical data is a `document` which can hold any kind of json data.
Documents are identified by "file" names.
Document names follow a certain schema which has various advantages:

- Human readable unique names
- No random parts in the name needed which mean documents can be found without knowledge of a random document id
- Core document system is generic, e.g. no knowledge about patients is needed but it's still possible to find all patient related documents.

For example, all patient related documents can be organized using document names starting with a patient directory:

```
/p/patient1/Patient
/p/patient1/HIVProgram
/p/patient1/HIVEncounters/20220301T11:10
/p/patient1/HIVEncounters/20220509T10:15
```

## Document json schema

Each document uses a JSON schema which describes the document's data shape.
The backend validates that an updated document fulfills the specified schema and otherwise rejects the document.

## Special predefined document types

Having a completely untyped data structures is not very useful and some common document formats are needed to provide some common functionality, e.g. listing all patients and encounters or doing a simple report in a generic ways.
For this reason document types such as Patient, Programs or Encounter have a predefined base type, i.e. they define a common data shape for the respective type.
However, clients are still able to extend these common document types.
For example, an additional field can be added to a medical record.
Note, that custom fields cannot be used in the generic part of the system but only in specialized views or reports.

To make common documents easier to access they are "cached" in dedicated auxiliary DB tables with common data fields exposed as DB columns.
Note, the underlying documents could still contain more custom data than stored in these aux tables.
A dedicated DB table is only need if there is common program related functionality that couldn't be implement easily or efficiently using raw json documents.
For example, a patient DB table could be used to efficiently search for common patient information such as name or date of birth or address, or an encounter DB table could be used to manage an schedule encounter events.

## Derive custom JSON schema from base schema

Common documents types have predefined commonly understood JSON schemas.
To extend a base schema new fields can be added to the base schema in a backwards compatible way.
Only adding new fields to a schema ensures that derived schemas still fullfil the base schema and thus can be handled generically.
For example:

```json
{
  // (base schema would need to be inlined though...)
  "allOf": [{ "$ref": "/schema/base" }],
  "properties": {
    "baz": { "type": "string" }
  }
}
```

## Document registry

In general documents are related to other documents, e.g. an encounter document is related to a certain type of program enrolment document.
These relations of document types are stored in the document registry.
The document registry also stores the json schema for a document type.
For example, when editing a new document of a certain type the document registry dictates which json schema the document data must follow.

Furthermore, the document registry contains a ui schema which defines how a document should be displayed.
Currently there is exactly one ui schema for each document type but in the future it might be necessary to support multiple ui schema depending on the context in which a document is shown.
For example, there could be a UI schema for the full document and one that only gives a summary of the document.

## Document versioning

Each edit of a document is stored as a new version.
The `document.id` is the version id while `document.name` is the general document identifier shared between all document versions.
TODO: rename `document.id` => `document.versionId` and `document.name` => `document.id`?

# Customizable Program User Interface

One of the requirements of the programs module is to provide a customizable user interface to display and edit custom document types.
To achieve this JSONForms UI schema files are used to define a customized UI.
JSONForms give UI designers great flexibility on how document data is composed and displayed.
Furthermore, custom control can be created to implemented specialized UI elements such as graphs or controls to generate patient IDs.

## Event trigger Controls

There some specialized controls which add events to the document data based on some user defined triggers.

## None standard controls and options

Specialized controls are located in `packages/system/src/Patient/JsonForms/components`.
These component files also contain type information and JS docs for the component options.

## Encounters data extraction

The graph control needs to fetch data from multiple encounters.
This is done through a fairly generic `encounterFields` endpoint which allows to extract an field from an encounter document.
For example, it allows to fetch all `data.physicalExamination.weight` fields from all patient encounters (note, that the weight is a custom field).

# Document access permissions [Draft]

Permissions are currently not implement but here is the plan:

Document access is restricted as follows:

1. User needs access to the patient associated with a document
2. User needs access to QUERY and/or MUTATE access to a document type, e.g. to restrict access to a certain program
