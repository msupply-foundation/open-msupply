use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    // Asset Class triggers
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'asset_class';

                CREATE TRIGGER asset_class_trigger
                AFTER INSERT OR UPDATE ON asset_class
                FOR EACH ROW EXECUTE PROCEDURE update_changelog();
            "#
        )?;
    } else {
        sql!(
            connection,
            r#"
                CREATE TRIGGER asset_class_insert_trigger
                AFTER INSERT ON asset_class
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ("asset_class", NEW.id, "UPSERT");
                END;
            "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TRIGGER asset_class_update_trigger
                AFTER UPDATE ON asset_class
                BEGIN
                INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('asset_class', NEW.id, 'UPSERT');
                END;
            "#
        )?;
    }

    // Asset Category triggers
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'asset_category';
                CREATE TRIGGER asset_category_trigger
                AFTER INSERT OR UPDATE ON asset_category
                FOR EACH ROW EXECUTE PROCEDURE update_changelog();
            "#
        )?;
    } else {
        sql!(
            connection,
            r#"
                CREATE TRIGGER asset_category_insert_trigger
                AFTER INSERT ON asset_category
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ("asset_category", NEW.id, "UPSERT");
                END;
            "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TRIGGER asset_category_update_trigger
                AFTER UPDATE ON asset_category
                BEGIN
                INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('asset_category', NEW.id, 'UPSERT');
                END;
            "#
        )?;
    }

    // Asset Type triggers
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'asset_type';
                CREATE TRIGGER asset_type_trigger
                AFTER INSERT OR UPDATE ON asset_type
                FOR EACH ROW EXECUTE PROCEDURE update_changelog();
            "#
        )?;
    } else {
        sql!(
            connection,
            r#"
                CREATE TRIGGER asset_type_insert_trigger
                AFTER INSERT ON asset_type
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ("asset_type", NEW.id, "UPSERT");
                END;
            "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TRIGGER asset_type_update_trigger
                AFTER UPDATE ON asset_type
                BEGIN
                INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('asset_type', NEW.id, 'UPSERT');
                END;
            "#
        )?;
    }

    // Asset Catalogue Item triggers
    if cfg!(feature = "postgres") {
        sql!(
            connection,
            r#"
                ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'asset_catalogue_item';
                CREATE TRIGGER asset_catalogue_item_trigger
                AFTER INSERT OR UPDATE ON asset_catalogue_item
                FOR EACH ROW EXECUTE PROCEDURE update_changelog();
            "#
        )?;
    } else {
        sql!(
            connection,
            r#"
                CREATE TRIGGER asset_catalogue_item_insert_trigger
                AFTER INSERT ON asset_catalogue_item
                BEGIN
                    INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ("asset_catalogue_item", NEW.id, "UPSERT");
                END;
            "#
        )?;

        sql!(
            connection,
            r#"
                CREATE TRIGGER asset_catalogue_item_update_trigger
                AFTER UPDATE ON asset_catalogue_item
                BEGIN
                INSERT INTO changelog (table_name, record_id, row_action)
                    VALUES ('asset_catalogue_item', NEW.id, 'UPSERT');
                END;
            "#
        )?;
    }

    Ok(())
}
