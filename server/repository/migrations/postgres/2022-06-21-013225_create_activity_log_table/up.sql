CREATE TYPE activity_log_type AS ENUM
(
    'USER_LOGGED_IN',
    'INVOICE_CREATED',
    'INVOICE_DELETED',
    'INVOICE_STATUS_ALLOCATED',
    'INVOICE_STATUS_PICKED',
    'INVOICE_STATUS_SHIPPED',
    'INVOICE_STATUS_DELIVERED',
    'INVOICE_STATUS_VERIFIED',
    'STOCKTAKE_CREATED',
    'STOCKTAKE_DELETED',
    'STOCKTAKE_STATUS_FINALISED',
    'REQUISITION_CREATED',
    'REQUISITION_DELETED',
    'REQUISITION_STATUS_SENT',
    'REQUISITION_STATUS_FINALISED'
);

CREATE TABLE activity_log
(
    id TEXT NOT NULL PRIMARY KEY,
    type activity_log_type, 
    user_id TEXT,
    store_id TEXT REFERENCES store(id),
    record_id TEXT,
    datetime TIMESTAMP NOT NULL
)