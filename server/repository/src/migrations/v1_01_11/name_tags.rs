use crate::migrations::*;

pub(crate) struct Migrate;
impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "name_tags"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            CREATE TABLE name_tag (
                id TEXT NOT NULL PRIMARY KEY,
                name TEXT NOT NULL
            );
            "#
        )?;

        sql!(
            connection,
            r#"
            CREATE TABLE name_tag_join (
                id TEXT NOT NULL PRIMARY KEY,
                name_id TEXT NOT NULL REFERENCES name(id),
                name_tag_id TEXT NOT NULL REFERENCES name_tag(id)
            );
            "#
        )?;

        Ok(())
    }
}
