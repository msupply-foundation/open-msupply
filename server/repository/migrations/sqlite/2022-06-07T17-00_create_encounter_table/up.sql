CREATE TABLE encounter (
    id TEXT NOT NULL PRIMARY KEY,
    patient_id TEXT NOT NULL,
    program TEXT NOT NULL,
    name TEXT NOT NULL,
    encounter_datetime TIMESTAMP NOT NULL,
    status TEXT CHECK (status IN (
        'SCHEDULED',
        'ONGOING',
        'FINISHED',
        'CANCELED',
        'MISSED'
    )) NOT NULL
)