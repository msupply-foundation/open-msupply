CREATE TABLE log (
    id TEXT NOT NULL PRIMARY KEY,
    log_type TEXT CHECK (log_type IN (
        'USER_LOGGED_IN',
        'INVOICE_CREATED',
        'INVOICE_STATUS_ALLOCATED',
        'INVOICE_STATUS_PICKED',
        'INVOICE_STATUS_SHIPPED',
        'INVOICE_STATUS_DELIVERED',
        'INVOICE_STATUS_VERIFIED'
    )) NOT NULL,
    user_id TEXT,
    store_id TEXT REFERENCES store(id),
    record_id TEXT REFERENCES invoice(id),
    datetime TIMESTAMP NOT NULL
)