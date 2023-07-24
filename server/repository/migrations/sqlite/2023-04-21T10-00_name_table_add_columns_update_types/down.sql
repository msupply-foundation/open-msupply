-- This file should undo anything in `up.sql`

-- 2021-08-15T10-00_create_name_table
ALTER TABLE name DROP COLUMN is_deceased;
ALTER TABLE name DROP COLUMN national_health_number;


-- 2022-03-15T10-00_report_table
CREATE TABLE report_original
(
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('OM_SUPPLY')) NOT NULL,
    template TEXT NOT NULL,
    context TEXT CHECK (context IN (
        'INBOUND_SHIPMENT',
        'OUTBOUND_SHIPMENT',
        'REQUISITION',
        'STOCKTAKE',
        'RESOURCE'
    )) NOT NULL,
    comment TEXT,
    sub_context TEXT,
    argument_schema_id TEXT REFERENCES form_schema(id)
);

INSERT INTO report_original SELECT id, name, type, template, context, comment, sub_context, argument_schema_id FROM report;
DROP TABLE report;
ALTER TABLE report_original RENAME TO report;
