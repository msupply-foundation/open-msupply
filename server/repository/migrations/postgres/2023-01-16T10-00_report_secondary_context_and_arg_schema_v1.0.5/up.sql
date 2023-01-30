ALTER TABLE report ADD sub_context TEXT;
ALTER TABLE report ADD argument_schema_id TEXT REFERENCES form_schema(id);