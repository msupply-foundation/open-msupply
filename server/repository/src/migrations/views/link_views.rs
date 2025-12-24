use super::*;
use crate::migrations::sql;

pub(crate) struct ViewMigration;

impl ViewMigrationFragment for ViewMigration {
    fn drop_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                DROP VIEW IF EXISTS name_store_join_view;
                DROP VIEW IF EXISTS store_view;
                DROP VIEW IF EXISTS name_tag_join_view;
                DROP VIEW IF EXISTS master_list_name_join_view;
            "#
        )?;

        Ok(())
    }

    fn rebuild_view(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE VIEW name_store_join_view AS
                SELECT
                    name_store_join.*,
                    name_link.name_id as name_id
                FROM
                    name_store_join
                JOIN
                    name_link ON name_store_join.name_link_id = name_link.id;

                CREATE VIEW store_view AS
                SELECT
                    store.*,
                    name_link.name_id as name_id
                FROM
                    store
                JOIN
                    name_link ON store.name_link_id = name_link.id;


                CREATE VIEW name_tag_join_view AS
                SELECT
                    name_tag_join.*,
                    name_link.name_id as name_id
                FROM
                    name_tag_join
                JOIN
                    name_link ON name_tag_join.name_link_id = name_link.id;

                CREATE VIEW master_list_name_join_view AS
                SELECT
                    master_list_name_join.*,
                    name_link.name_id as name_id
                FROM
                    master_list_name_join
                JOIN
                    name_link ON master_list_name_join.name_link_id = name_link.id;
            "#
        )?;

        Ok(())
    }
}
