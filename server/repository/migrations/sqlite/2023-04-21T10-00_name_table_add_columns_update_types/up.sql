-- These changes were originally inserted into an earlier migration on develop,
-- which means they won't run when updating to a "programs" branch if the
-- earlier migrations had already run.

-- 2021-08-15T10-00_create_name_table
ALTER TABLE name ADD COLUMN type_new TEXT NOT NULL DEFAULT "FACILITY";
UPDATE name SET type_new =  type;
ALTER TABLE name DROP COLUMN type;
ALTER TABLE name RENAME COLUMN type_new TO type;

ALTER TABLE name ADD COLUMN gender_new TEXT;
UPDATE name SET gender_new =  gender;
ALTER TABLE name DROP COLUMN gender;
ALTER TABLE name RENAME COLUMN gender_new TO gender;

ALTER TABLE name ADD COLUMN is_deceased BOOLEAN;
ALTER TABLE name ADD COLUMN national_health_number TEXT;

-- 2022-03-15T10-00_report_table


-- 2022-03-25T14-30_create_user_permission_table

