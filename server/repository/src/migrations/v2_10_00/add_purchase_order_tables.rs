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
                    created_by TEXT,
                    supplier_name_link_id TEXT NOT NULL REFERENCES name_link(id),
                    purchase_order_number BIGINT NOT NULL,
                    status {purchase_order_status} NOT NULL,
                    created_datetime {DATETIME} NOT NULL,
                    confirmed_datetime {DATETIME},
                    target_months {DOUBLE},
                    comment TEXT,
                    supplier_discount_amount {DOUBLE} NOT NULL,
                    donor_link_id TEXT REFERENCES name_link(id),
                    reference TEXT,
                    currency_id TEXT REFERENCES currency(id),
                    foreign_exchange_rate {DOUBLE} NOT NULL DEFAULT 1.0,
                    shipping_method TEXT,
                    sent_datetime {DATETIME},
                    contract_signed_date {DATE},
                    advance_paid_date {DATE},
                    received_at_port_date {DATE},
                    requested_delivery_date {DATE},
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
                    order_total_before_discount {DOUBLE} NOT NULL,
                    order_total_after_discount {DOUBLE} NOT NULL
                );
            "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TABLE purchase_order_line (
                    id TEXT NOT NULL PRIMARY KEY,
                    purchase_order_id TEXT REFERENCES purchase_order(id) NOT NULL,
                    store_id TEXT NOT NULL REFERENCES store(id),
                    line_number BIGINT NOT NULL,
                    item_link_id TEXT REFERENCES item_link(id) NOT NULL,
                    item_name TEXT NOT NULL,
                    requested_pack_size {DOUBLE} NOT NULL DEFAULT 1.0,
                    requested_number_of_units {DOUBLE} NOT NULL DEFAULT 0.0,
                    authorised_number_of_units {DOUBLE},
                    received_number_of_units {DOUBLE},
                    requested_delivery_date {DATE},
                    expected_delivery_date {DATE},
                    stock_on_hand_in_units {DOUBLE} NOT NULL DEFAULT 0.0,
                    supplier_item_code TEXT,
                    price_per_unit_before_discount {DOUBLE} NOT NULL DEFAULT 0.0,
                    price_per_unit_after_discount {DOUBLE} NOT NULL DEFAULT 0.0
                );
            "#
        )?;

        Ok(())
    }
}
