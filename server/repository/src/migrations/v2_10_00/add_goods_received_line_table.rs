use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_goods_received_line_table"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE number_type ADD VALUE IF NOT EXISTS 'GOODS_RECEIVED_LINE';
                    ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'goods_received_line';
                "#
            )?;
        }

        let status_type = if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                     CREATE TYPE goods_received_line_status AS ENUM ('UNAUTHORISED', 'AUTHORISED');
                "#
            )?;

            "goods_received_line_status"
        } else {
            "TEXT"
        };

        sql!(
            connection,
            r#"
                CREATE TABLE goods_received_line (
                    id TEXT NOT NULL PRIMARY KEY,
                    goods_received_id TEXT NOT NULL REFERENCES goods_received(id),
                    purchase_order_id TEXT NOT NULL REFERENCES purchase_order(id),
                    received_pack_size {DOUBLE} NOT NULL,
                    number_of_packs_received {DOUBLE} NOT NULL DEFAULT 0.0,
                    batch TEXT,
                    weight_per_pack {DOUBLE},
                    expiry_date {DATE},
                    line_number BIGINT NOT NULL,
                    item_link_id TEXT REFERENCES item_link(id) NOT NULL,
                    item_name TEXT NOT NULL,
                    location_id TEXT REFERENCES location(id),
                    volume_per_pack {DOUBLE},
                    manufacturer_link_id TEXT NOT NULL REFERENCES name_link(id),
                    status {status_type} NOT NULL DEFAULT 'UNAUTHORISED',
                    comment TEXT
                );
            "#
        )?;

        Ok(())
    }
}
