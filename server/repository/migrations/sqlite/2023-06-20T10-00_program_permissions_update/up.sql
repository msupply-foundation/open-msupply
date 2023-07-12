DROP TABLE IF EXISTS document_registry;

CREATE TABLE document_registry (
    id TEXT NOT NULL PRIMARY KEY,
    type TEXT NOT NULL,
    document_type TEXT NOT NULL,
    document_context TEXT NOT NULL,
    name TEXT,
    parent_id TEXT REFERENCES document_registry(id),
    form_schema_id TEXT REFERENCES form_schema(id),
    config Text
);

ALTER TABLE document DROP COLUMN context;
ALTER TABLE document ADD context TEXT NOT NULL;

ALTER TABLE program_enrolment DROP COLUMN program;
ALTER TABLE program_enrolment ADD context TEXT NOT NULL;
ALTER TABLE program_enrolment ADD document_type TEXT NOT NULL;

ALTER TABLE encounter DROP COLUMN type;
ALTER TABLE encounter ADD document_type TEXT NOT NULL; 
ALTER TABLE encounter DROP COLUMN program;
ALTER TABLE encounter ADD context TEXT NOT NULL;

ALTER TABLE program_event ADD context TEXT NOT NULL;
