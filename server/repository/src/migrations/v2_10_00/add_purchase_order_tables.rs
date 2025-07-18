use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_purchase_order_tables"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        let purchase_order_status = if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                CREATE TYPE purchase_order_status AS ENUM
                    (
                        'NEW',
                        'CONFIRMED',
                        'AUTHORISED',
                        'FINALISED'
                    );
            "#
            )?;

            "purchase_order_status"
        } else {
            "TEXT"
        };

        sql!(
            connection,
            r#"
                CREATE TABLE purchase_order (
                    id TEXT NOT NULL PRIMARY KEY,
                    store_id TEXT NOT NULL REFERENCES store(id),
                    user_id TEXT,
                    supplier_name_link_id TEXT REFERENCES name_link(id),
                    -- corresponds to OG "serial_number"
                    purchase_order_number BIGINT NOT NULL,
                    status {purchase_order_status} NOT NULL,
                    created_datetime {DATETIME} NOT NULL,
                    confirmed_datetime {DATETIME},
                    delivered_datetime {DATETIME},
                    target_months {DOUBLE},
                    comment TEXT,
                    supplier_discount_percentage {DOUBLE},
                    supplier_discount_amount {DOUBLE},
                    donor_link_id TEXT REFERENCES name_link(id),
                    reference TEXT,
                    currency_id TEXT REFERENCES currency(id),
                    foreign_exchange_rate {DOUBLE},
                    shipping_method TEXT,
                    sent_datetime {DATETIME},
                    contract_signed_datetime {DATETIME},
                    advance_paid_datetime {DATETIME},
                    received_at_port_datetime {DATE},
                    expected_delivery_datetime {DATE},
                    supplier_agent TEXT,
                    authorising_officer_1 TEXT,
                    authorising_officer_2 TEXT,
                    additional_instructions TEXT,
                    heading_message TEXT,
                    agent_commission {DOUBLE},
                    document_charge {DOUBLE},
                    communications_charge {DOUBLE},
                    insurance_charge {DOUBLE},
                    freight_charge {DOUBLE},
                    freight_conditions TEXT
                );
            "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TABLE purchase_order_line (
                    id TEXT NOT NULL PRIMARY KEY,
                    purchase_order_id TEXT REFERENCES purchase_order(id) NOT NULL,
                    line_number BIGINT NOT NULL,
                    item_link_id TEXT REFERENCES item_link(id) NOT NULL,
                    item_name TEXT,
                    number_of_packs {DOUBLE},
                    pack_size {DOUBLE},
                    -- corresponds to OG "original_quantity" (quan_original_order)?
                    requested_quantity {DOUBLE},
                    -- corresponds to OG "adjusted_quantity" (quan_adjusted_order)?
                    authorised_quantity {DOUBLE},
                    -- I believe this corresponds to OG "quan_rec_to_date"
                    total_received {DOUBLE},
                    requested_delivery_date {DATE},
                    expected_delivery_date {DATE}
                );
            "#
        )?;

        sql!(
            connection,
            r#"
                ALTER TABLE invoice ADD COLUMN purchase_order_id TEXT REFERENCES purchase_order(id);
                ALTER TABLE invoice_line ADD COLUMN purchase_order_line_id TEXT REFERENCES purchase_order(id);
            "#
        )?;

        Ok(())
    }
}
