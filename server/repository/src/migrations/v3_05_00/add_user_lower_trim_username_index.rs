use crate::migrations::*;

/// A user is found by their trimmed username in any letter case, and every new or renamed user is
/// checked against the others' usernames. Without the index each check reads the whole table.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_user_lower_trim_username_index"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                CREATE INDEX index_user_account_lower_trim_username ON user_account (lower(trim(username)));
            "#,
        )?;

        Ok(())
    }
}
