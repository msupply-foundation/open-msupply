CREATE TYPE encounter_status AS ENUM (
    'SCHEDULED',
    'COMPLETED',
    'CANCELLED'
);

CREATE TABLE encounter (
    id TEXT NOT NULL PRIMARY KEY,
    type TEXT NOT NULL,
    document_name TEXT NOT NULL,
    patient_id TEXT NOT NULL,
    program TEXT NOT NULL,
    created_datetime TIMESTAMP NOT NULL,
    start_datetime TIMESTAMP NOT NULL,
    end_datetime TIMESTAMP,
    status encounter_status,
    clinician_id TEXT REFERENCES clinician(id)
)