use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "remove_goods_received"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Update tables
        sql!(
            connection,
            r#"
                ALTER TABLE invoice DROP COLUMN goods_received_id;
                DROP TABLE goods_received_line;
                DROP TABLE goods_received;
                ALTER TABLE purchase_order_line DROP COLUMN received_number_of_units;
            "#
        )?;

        // Rename Permissions
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE permission_type RENAME VALUE 'GOODS_RECEIVED_QUERY' TO 'INBOUND_SHIPMENT_EXTERNAL_QUERY';
                    ALTER TYPE permission_type RENAME VALUE 'GOODS_RECEIVED_MUTATE' TO 'INBOUND_SHIPMENT_EXTERNAL_MUTATE';
                    ALTER TYPE permission_type RENAME VALUE 'GOODS_RECEIVED_AUTHORISE' TO 'INBOUND_SHIPMENT_EXTERNAL_AUTHORISE';
                "#
            )?;
        } else {
            sql!(
                connection,
                r#"
                    UPDATE user_permission SET permission = 'INBOUND_SHIPMENT_EXTERNAL_QUERY' WHERE permission = 'GOODS_RECEIVED_QUERY';
                    UPDATE user_permission SET permission = 'INBOUND_SHIPMENT_EXTERNAL_MUTATE' WHERE permission = 'GOODS_RECEIVED_MUTATE';
                    UPDATE user_permission SET permission = 'INBOUND_SHIPMENT_EXTERNAL_AUTHORISE' WHERE permission = 'GOODS_RECEIVED_AUTHORISE';
                "#
            )?;
        }

        // Delete related entries
        sql!(
            connection,
            r#"
                DELETE FROM number WHERE type = 'GOODS_RECEIVED' or type like 'GOODSRECEIVEDLINE_%';
                DELETE FROM changelog WHERE table_name IN (
                    'goods_received_line',
                    'goods_received'
                );
                DELETE FROM report WHERE context = 'GOODS_RECEIVED';
            "#
        )?;

        // Remove now unused enum variants
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    DROP TYPE goods_received_status;
                    DROP TYPE goods_received_line_status;
                "#
            )?;
            sql!(
                connection,
                r#"
                    DROP TYPE number_type; -- Not used any more as now a string is used
                "#
            )?;
        }

        Ok(())
    }
}
