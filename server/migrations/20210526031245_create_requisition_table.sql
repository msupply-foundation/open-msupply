-- migrations/20210526031245_create_requisition_table.sql
-- Create requisition table
CREATE TABLE requisition (
    id uuid NOT NULL,
    PRIMARY KEY (id),
    from_id uuid NOT NULL,
    to_id uuid NOT NULL
);