DROP TABLE IF EXISTS document_registry CASCADE;
DROP TYPE IF EXISTS document_context CASCADE;

CREATE TYPE document_registry_type AS ENUM (
    'PATIENT',
    'PROGRAM_ENROLMENT',
    'ENCOUNTER',
    'CUSTOM'
);

CREATE TABLE document_registry (
    id TEXT NOT NULL PRIMARY KEY,
    type document_registry_type NOT NULL,
    document_type TEXT NOT NULL,
    document_context TEXT NOT NULL,
    name TEXT,
    parent_id TEXT REFERENCES document_registry(id),
    form_schema_id TEXT REFERENCES form_schema(id),
    config Text
);

ALTER TABLE document DROP COLUMN context CASCADE;
ALTER TABLE document ADD context TEXT NOT NULL;

-- recreate the view which has bee deleted by CASCADE
CREATE VIEW latest_document AS
SELECT d.*
FROM (
      SELECT name, MAX(datetime) AS datetime
      FROM document
      GROUP BY name
) grouped
INNER JOIN document d
ON d.name = grouped.name AND d.datetime = grouped.datetime;

ALTER TABLE program_enrolment DROP COLUMN program CASCADE;
ALTER TABLE program_enrolment ADD context TEXT NOT NULL;
ALTER TABLE program_enrolment ADD document_type TEXT NOT NULL;

ALTER TABLE encounter DROP COLUMN type CASCADE;
ALTER TABLE encounter ADD document_type TEXT NOT NULL;
ALTER TABLE encounter DROP COLUMN program CASCADE;
ALTER TABLE encounter ADD context TEXT NOT NULL;

ALTER TABLE program_event ADD context TEXT NOT NULL;