CREATE TYPE log_type AS ENUM (
    'USER_LOGGED_IN',
    'INVOICE_CREATED',
    'INVOICE_STATUS_SHIPPED'
);

CREATE TABLE log (
    id TEXT NOT NULL PRIMARY KEY,
    type log_type, 
    user_id TEXT NOT NULL,
    record_id TEXT NOT NULL,
    created_datetime TIMESTAMP NOT NULL
)