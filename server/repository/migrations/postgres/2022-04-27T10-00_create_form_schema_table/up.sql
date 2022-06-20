CREATE TABLE form_schema (
    id TEXT NOT NULL PRIMARY KEY,
    type TEXT NOT NULL,
    json_schema TEXT NOT NULL,
    ui_schema TEXT NOT NULL
)