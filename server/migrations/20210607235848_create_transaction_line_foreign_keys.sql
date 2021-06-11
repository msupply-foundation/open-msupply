-- Create transaction_line foreign key constraints.

BEGIN;
ALTER TABLE transaction_line ADD CONSTRAINT fk_transaction FOREIGN KEY(transaction_id) REFERENCES transaction(id);
ALTER TABLE transaction_line ADD CONSTRAINT fk_item FOREIGN KEY(item_id) REFERENCES item(id);
ALTER TABLE transaction_line ADD CONSTRAINT fk_item_line FOREIGN KEY(item_line_id) REFERENCES item_line(id);
COMMIT;

