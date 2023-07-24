CREATE TABLE clinician_store_join (
    id TEXT NOT NULL PRIMARY KEY,
    clinician_id TEXT NOT NULL REFERENCES clinician(id),
    store_id TEXT NOT NULL REFERENCES store(id)
)