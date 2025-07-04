use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_contact_table"
    }
    //TODO: change name_id to name_link_id and reference name_link table not name table. also update in other layers
    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE TABLE contact (
                    id TEXT NOT NULL PRIMARY KEY,
                    name_link_id TEXT NOT NULL REFERENCES name_link (id),
                    first_name TEXT NOT NULL,
                    position TEXT,
                    comment TEXT,
                    last_name TEXT NOT NULL,
                    phone TEXT,
                    email TEXT,
                    category_1 TEXT,
                    category_2 TEXT,
                    category_3 TEXT,
                    address_1 TEXT,
                    address_2 TEXT,
                    country TEXT
                );
            "#
        )?;

        Ok(())
    }
}