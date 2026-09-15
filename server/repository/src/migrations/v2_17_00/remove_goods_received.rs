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

        // Rename permissions
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
                DELETE FROM activity_log WHERE type IN (
                    'GOODS_RECEIVED_CREATED',
                    'GOODS_RECEIVED_DELETED',
                    'GOODS_RECEIVED_STATUS_FINALISED'
                );
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
                    DROP TYPE number_type; -- Not used any more as now a string is used
                "#
            )?;

            // To remove these variants we'd need to create new enums without the goods received variants and this was decided against.
            // sql!(
            //     connection,
            //     r#"
            //         ALTER TYPE activity_log_type DROP VALUE 'GOODS_RECEIVED_CREATED';
            //         ALTER TYPE activity_log_type DROP VALUE 'GOODS_RECEIVED_DELETED';
            //         ALTER TYPE activity_log_type DROP VALUE 'GOODS_RECEIVED_STATUS_FINALISED';
            //         ALTER TYPE number_type DROP VALUE 'GOODS_RECEIVED_LINE';
            //         ALTER TYPE number_type DROP VALUE 'GOODS_RECEIVED';
            //         ALTER TYPE changelog_table_name DROP VALUE 'goods_received_line';
            //         ALTER TYPE changelog_table_name DROP VALUE 'goods_received';
            //         ALTER TYPE context_type DROP VALUE 'GOODS_RECEIVED';
            //     "#
            // )?;
        }

        Ok(())
    }
}
