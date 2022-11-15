CREATE TABLE program_event (
    id TEXT NOT NULL PRIMARY KEY,
    patient_id TEXT,
    datetime TIMESTAMP NOT NULL,
    active_start_datetime TIMESTAMP NOT NULL CHECK(datetime <= active_start_datetime),
    active_end_datetime TIMESTAMP NOT NULL CHECK(datetime <= active_end_datetime),
    document_type TEXT NOT NULL,
    document_name TEXT,
    type TEXT NOT NULL,
    name TEXT,
    FOREIGN KEY(patient_id) REFERENCES name(id)
);
