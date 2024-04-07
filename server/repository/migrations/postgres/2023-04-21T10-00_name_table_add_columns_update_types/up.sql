-- These changes were originally inserted into an earlier migration on develop,
-- which means they won't run when updating to a "programs" branch if the
-- earlier migrations had already run.

-- 2021-08-15T10-00_create_name_table
ALTER TYPE gender_type ADD VALUE IF NOT EXISTS 'TRANSGENDER' BEFORE 'TRANSGENDER_MALE';

ALTER TABLE name ADD COLUMN IF NOT EXISTS is_deceased BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE name ADD COLUMN IF NOT EXISTS national_health_number TEXT;


-- 2022-03-15T10-00_report_table
ALTER TYPE context_type ADD VALUE IF NOT EXISTS 'PATIENT';
ALTER TYPE context_type ADD VALUE IF NOT EXISTS 'DISPENSARY';


-- 2022-03-25T14-30_create_user_permission_table
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'PATIENT_QUERY';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'PATIENT_MUTATE';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'DOCUMENT_QUERY';
ALTER TYPE permission_type ADD VALUE IF NOT EXISTS 'DOCUMENT_MUTATE';

    