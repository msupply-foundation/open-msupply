use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
        -- Adding changelog.name_link_id
        ALTER TABLE changelog
        ADD COLUMN name_link_id TEXT;
        
        UPDATE changelog
        SET name_link_id = name_id;
        
        ALTER TABLE changelog ADD CONSTRAINT changelog_name_link_id_fkey FOREIGN KEY (name_link_id) REFERENCES name_link(id);
        "#,
    )?;

    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
        -- Adding changelog.name_link_id
        PRAGMA foreign_keys = OFF;
        ALTER TABLE changelog
        ADD COLUMN name_link_id TEXT REFERENCES name_link(id);
        
        UPDATE changelog
        SET name_link_id = name_id;
        PRAGMA foreign_keys = ON;
     "#,
    )?;

    sql! {
        connection,
        r#"
        DROP INDEX "index_changelog_name_id_fkey" ON "changelog" ("name_id");
        ALTER TABLE changelog DROP COLUMN name_id;
        CREATE INDEX "index_changelog_name_link_id_fkey" ON "changelog" ("name_link_id");
        "#
    }?;

    Ok(())
}
