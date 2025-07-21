use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_goods_receiving_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE number_type ADD VALUE IF NOT EXISTS 'GOODS_RECEIVING';
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'goods_receiving';
                "#
            )?;
        }

        let status_type = if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                     CREATE TYPE goods_receiving_status AS ENUM ('NEW', 'FINALISED');
                "#
            )?;

            "goods_receiving_status"
        } else {
            "TEXT"
        };

        sql!(
            connection,
            r#"
                CREATE TABLE goods_receiving (
                    id TEXT NOT NULL PRIMARY KEY,
                    store_id TEXT NOT NULL REFERENCES store(id),
                    purchase_order_id TEXT REFERENCES purchase_order(id),
                    inbound_shipment_id TEXT REFERENCES invoice(id),
                    goods_receiving_number BIGINT NOT NULL,
                    status {status_type} NOT NULL DEFAULT 'NEW',
                    received_date {DATE},
                    comment TEXT,
                    supplier_reference TEXT,
                    donor_link_id TEXT, -- references name(id) via name_link(id)
                    created_datetime {DATETIME} NOT NULL, -- corresponds to OG "entry_date"
                    modified_datetime {DATETIME} NOT NULL, 
                    finalised_datetime {DATETIME},
                    created_by TEXT, --- corresponds to OG "user_id_created"
                    modified_by TEXT --- corresponds to OG "user_id_modified"
                );
            "#
        )?;
        Ok(())
    }
}
