CREATE TABLE report (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT CHECK (type IN ('OM_SUPPLY')) NOT NULL,
    template TEXT NOT NULL,
    context TEXT CHECK (context IN (
        'INBOUND_SHIPMENT',
        'OUTBOUND_SHIPMENT',
        'REQUISITION',
        'STOCKTAKE',
        'RESOURCE'
    )) NOT NULL,
    comment TEXT
)