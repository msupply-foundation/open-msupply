-- Create transaction_line table 
CREATE TABLE transaction_line (
    id TEXT NOT NULL,
    CONSTRAINT pk_transaction_line PRIMARY KEY(id),
    transaction_id TEXT NOT NULL,
    CONSTRAINT fk_transaction FOREIGN KEY(transaction_id) REFERENCES transaction(id),
    item_id TEXT NOT NULL,
    CONSTRAINT fk_item FOREIGN KEY(item_id) REFERENCES item(id),
    item_line_id TEXT NOT NULL,
    CONSTRAINT fk_item_line FOREIGN KEY(item_line_id) REFERENCES item_line(id)
)