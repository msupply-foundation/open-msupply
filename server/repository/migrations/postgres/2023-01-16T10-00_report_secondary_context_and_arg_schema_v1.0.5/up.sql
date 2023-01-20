ALTER TABLE report ADD context2 TEXT;
ALTER TABLE report ADD argument_schema_id TEXT REFERENCES form_schema(id);