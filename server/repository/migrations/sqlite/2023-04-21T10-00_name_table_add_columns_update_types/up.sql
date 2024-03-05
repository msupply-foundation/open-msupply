-- These changes were originally inserted into an earlier migration on develop,
-- which means they won't run when updating to a "programs" branch if the
-- earlier migrations had already run.

-- 2021-08-15T10-00_create_name_table
ALTER TABLE name ADD COLUMN gender_new TEXT;
UPDATE name SET gender_new =  gender;
ALTER TABLE name DROP COLUMN gender;
ALTER TABLE name RENAME COLUMN gender_new TO gender;

ALTER TABLE name ADD COLUMN is_deceased BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE name ADD COLUMN national_health_number TEXT;

-- 2022-03-15T10-00_report_table
CREATE TABLE report_new
(
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    template TEXT NOT NULL,
    context TEXT NOT NULL,
    comment TEXT,
    sub_context TEXT,
    argument_schema_id TEXT REFERENCES form_schema(id)
);

INSERT INTO report_new SELECT id, name, type, template, context, comment, sub_context, argument_schema_id FROM report;
DROP TABLE report;
ALTER TABLE report_new RENAME TO report;


-- 2022-03-25T14-30_create_user_permission_table

