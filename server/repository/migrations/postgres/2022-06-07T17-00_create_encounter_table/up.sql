CREATE TYPE encounter_status AS ENUM (
    'SCHEDULED',
    'ONGOING',
    'FINISHED',
    'CANCELED',
    'MISSED'
);

CREATE TABLE encounter (
    id TEXT NOT NULL PRIMARY KEY,
    patient_id TEXT NOT NULL,
    program TEXT NOT NULL,
    name TEXT NOT NULL,
    encounter_datetime TIMESTAMP NOT NULL,
    status encounter_status NOT NULL
)