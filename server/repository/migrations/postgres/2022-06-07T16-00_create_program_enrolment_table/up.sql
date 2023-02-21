CREATE TABLE program_enrolment (
    id TEXT NOT NULL PRIMARY KEY,
    program TEXT NOT NULL,
    document_name TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    enrolment_datetime TIMESTAMP NOT NULL,
    program_enrolment_id TEXT
)