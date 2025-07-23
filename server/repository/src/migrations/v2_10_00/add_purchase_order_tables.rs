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
                    supplier_name_link_id TEXT NOT NULL REFERENCES name_link(id),
                    -- corresponds to OG "serial_number"
                    purchase_order_number BIGINT NOT NULL,
                    status {purchase_order_status} NOT NULL,
                    created_datetime {DATETIME} NOT NULL,
                    confirmed_datetime {DATETIME},
                    target_months {DOUBLE},
                    comment TEXT,
                    supplier_discount_percentage {DOUBLE},
                    supplier_discount_amount {DOUBLE},
                    donor_link_id TEXT REFERENCES name_link(id),
                    reference TEXT,
                    currency_id TEXT REFERENCES currency(id),
                    foreign_exchange_rate {DOUBLE},
                    shipping_method TEXT,
                    sent_date {DATE},
                    contract_signed_date {DATE},
                    advance_paid_date {DATE},
                    received_at_port_date {DATE},
                    expected_delivery_date {DATE},
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
                    freight_conditions TEXT,
                    order_total_before_discount {DOUBLE},
                    order_total_after_discount {DOUBLE}
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
                    item_name TEXT NOT NULL,
                    requested_pack_size {DOUBLE} NOT NULL DEFAULT 1.0,
                    -- corresponds to OG "original_quantity"
                    requested_quantity {DOUBLE} NOT NULL DEFAULT 0.0,
                    -- corresponds to OG "adjusted_quantity"
                    authorised_quantity {DOUBLE},
                    received_number_of_units {DOUBLE},
                    requested_delivery_date {DATE},
                    expected_delivery_date {DATE},
                    soh_in_units {DOUBLE} NOT NULL DEFAULT 0.0,
                    supplier_item_code TEXT,
                    price_per_pack_before_discount {DOUBLE} NOT NULL DEFAULT 0.0,
                    discount_percentage {DOUBLE} NOT NULL DEFAULT 0.0
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
