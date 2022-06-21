CREATE TABLE log (
    id TEXT NOT NULL PRIMARY KEY,
    log_type TEXT CHECK (log_type IN (
        'USER_LOGGED_IN',
        'INVOICE_CREATED',
        'INVOICE_STATUS_SHIPPED'
    )) NOT NULL,
    user_id TEXT NOT NULL,
    record_id TEXT NOT NULL,
    created_datetime TIMESTAMP NOT NULL
)