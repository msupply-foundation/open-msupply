-- Add migration script here
-- Create requisition table
CREATE TABLE requisition (
    id TEXT NOT NULL,
    constraint pk_requisition PRIMARY KEY(id),
    from_id TEXT NOT NULL,
    to_id TEXT NOT NULL
)