use crate::{migrations::sql, StorageConnection};

pub(crate) fn migrate(connection: &mut StorageConnection) -> anyhow::Result<()> {
    #[cfg(feature = "postgres")]
    sql!(
        connection,
        r#"
            -- Adding document.owner_name_link_id
            ALTER TABLE document
            ADD COLUMN owner_name_link_id TEXT;

            UPDATE document
            SET owner_name_link_id = owner_name_id;

            ALTER TABLE document ADD CONSTRAINT document_owner_name_link_id_fkey FOREIGN KEY (owner_name_link_id) REFERENCES name_link(id);
       "#,
    )?;
    #[cfg(not(feature = "postgres"))]
    sql!(
        connection,
        r#"
            -- Adding document.owner_name_link_id
            PRAGMA foreign_keys = OFF;

            ALTER TABLE document
            ADD COLUMN owner_name_link_id TEXT REFERENCES name_link (id);

            UPDATE document SET owner_name_link_id = owner_name_id;

            PRAGMA foreign_keys = ON;
            "#,
    )?;

    sql!(
        connection,
        r#"
            DROP VIEW latest_document;

            -- Unrelated: rename existing name index:
            DROP INDEX ix_document_name_unique;
            DROP INDEX index_document_owner_name_id;
            ALTER TABLE document DROP COLUMN owner_name_id;
            CREATE INDEX "index_document_name" ON "document" ("name");
            CREATE INDEX "index_document_owner_name_link_id" ON "document" ("owner_name_link_id");

            CREATE VIEW latest_document
              AS
                  SELECT d.*
                  FROM (
                  SELECT name, MAX(datetime) AS datetime
                      FROM document
                      GROUP BY name
              ) grouped
              INNER JOIN document d
              ON d.name = grouped.name AND d.datetime = grouped.datetime;
        "#
    )?;

    Ok(())
}
