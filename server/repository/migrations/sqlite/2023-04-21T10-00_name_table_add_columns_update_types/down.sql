-- This file should undo anything in `up.sql`

-- 2021-08-15T10-00_create_name_table
ALTER TABLE name DROP COLUMN is_deceased;
ALTER TABLE name DROP COLUMN national_health_number;