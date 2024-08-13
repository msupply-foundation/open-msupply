use crate::migrations::{Migration, MigrationFragment};

use super::{
    migration_fragment_log::migration_fragment_log::dsl, RepositoryError, StorageConnection,
};

use chrono::Utc;
use diesel::prelude::*;

table! {
    migration_fragment_log (version_and_identifier) {
        version_and_identifier -> Text,
        datetime -> Timestamp
    }
}

pub struct MigrationFragmentLogRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> MigrationFragmentLogRepository<'a> {
    pub(crate) fn new(connection: &'a StorageConnection) -> Self {
        MigrationFragmentLogRepository { connection }
    }

    fn version_and_identifier(
        migration: &Box<dyn Migration>,
        migration_fragment: &Box<dyn MigrationFragment>,
    ) -> String {
        // Must be base version (no RC)
        format!(
            "{}-{}",
            migration.version(),
            migration_fragment.identifier()
        )
    }

    pub(crate) fn insert(
        &self,
        migration: &Box<dyn Migration>,
        migration_fragment: &Box<dyn MigrationFragment>,
    ) -> Result<(), RepositoryError> {
        let values = (
            dsl::version_and_identifier
                .eq(Self::version_and_identifier(migration, migration_fragment)),
            dsl::datetime.eq(Utc::now().naive_utc()),
        );

        diesel::insert_into(dsl::migration_fragment_log)
            .values(values)
            .execute(self.connection.lock().connection())?;

        Ok(())
    }

    pub(crate) fn has_run(
        &self,
        migration: &Box<dyn Migration>,
        migration_fragment: &Box<dyn MigrationFragment>,
    ) -> Result<bool, RepositoryError> {
        let filter = dsl::version_and_identifier
            .eq(Self::version_and_identifier(migration, migration_fragment));

        let count: i64 = dsl::migration_fragment_log
            .filter(filter)
            .count()
            .get_result(self.connection.lock().connection())?;

        Ok(count > 0)
    }
}
