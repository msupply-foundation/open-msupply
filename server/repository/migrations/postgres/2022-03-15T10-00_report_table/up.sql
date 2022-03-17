CREATE TYPE report_type AS ENUM (
    'PPRO', 'GREP', 'OM_REPORT'
);

CREATE TYPE category_type AS ENUM (
    'INVOICE', 'REQUISITION', 'STOCKTAKE', "RESOURCE"
);


CREATE TABLE report (
    id TEXT NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    type report_type NOT NULL,
    data TEXT NOT NULL,
    context category_type NOT NULL,
)