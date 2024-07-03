#[macro_use]
extern crate diesel;
#[macro_use]
extern crate diesel_migrations;

pub mod database_settings;
pub mod db_diesel;
pub mod diesel_extensions;
pub mod diesel_macros;
pub mod migrations;
pub mod mock;
mod repository_error;
pub mod test_db;
pub use self::db_diesel::*;
pub use self::repository_error::RepositoryError;
pub use database_settings::get_storage_connection_manager;
use diesel::sql_types::Text;
use std::any::Any;
use std::str;

mod tests;

sql_function!(fn lower(x: Text) -> Text);

#[cfg(feature = "postgres")]
embed_migrations!("./migrations/postgres");
#[cfg(not(feature = "postgres"))]
embed_migrations!("./migrations/sqlite");

pub fn run_db_migrations(connection: &StorageConnection) -> Result<(), String> {
    let mut boxed_buffer = Box::<Vec<u8>>::default();
    embedded_migrations::run_with_output(&connection.connection, &mut boxed_buffer)
        .map_err(|e| e.to_string())?;
    // Using log::info for migrations result will make sure they don't appear in test
    log::info!(
        "{}",
        str::from_utf8(&boxed_buffer).map_err(|e| e.to_string())?
    );
    Ok(())
}

use std::fmt::Debug as DebugTrait;
pub trait Delete: DebugTrait {
    fn delete(&self, con: &StorageConnection) -> Result<(), RepositoryError>;
    // Test only
    fn assert_deleted(&self, con: &StorageConnection);
}

pub trait StoreAndNameLinkId {
    fn get_store_and_name_link_id(
        &self,
        _: &StorageConnection,
    ) -> Result<(Option<String>, Option<String>), RepositoryError>;
}

pub trait Upsert: DebugTrait {
    // TODO:(Long term) DELETE THIS TRAIT METHOD AND REMOVE TRIGGERS?
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError>;

    fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
        self.upsert_sync(con)?;
        // When not using triggers to create changelog records, this is where you may want to implement changelog logic
        // This function should return the id of the changelog record created...
        Ok(None)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection);
    // Test only, can be used to drill down to concrete type (see test below)
    // also casting to any must be implemented by concrete type to be able to downcast to it
    // This is needed for integration test (where test record is generated for inventory adjustment, but id is not know until site is created)
    fn as_mut_any(&mut self) -> Option<&mut dyn Any> {
        None
    }
}

impl<T> StoreAndNameLinkId for T
where
    T: Upsert,
{
    fn get_store_and_name_link_id(
        &self,
        _: &StorageConnection,
    ) -> Result<(Option<String>, Option<String>), RepositoryError> {
        Ok((None, None))
    }
}

#[test]
fn downcast_example() {
    let mut boxed: Vec<Box<dyn Upsert>> = vec![
        Box::<InvoiceRow>::default(),
        Box::<InvoiceLineRow>::default(),
    ];

    for record in &mut boxed {
        let Some(mut_invoice) = record
            .as_mut_any()
            .and_then(|any| any.downcast_mut::<InvoiceRow>())
        else {
            continue;
        };

        mut_invoice.id = "changed_id".to_string()
    }

    let compare_to: Vec<Box<dyn Upsert>> = vec![
        Box::new(InvoiceRow {
            id: "changed_id".to_string(),
            ..Default::default()
        }),
        Box::<InvoiceLineRow>::default(),
    ];

    assert_eq!(format!("{boxed:?}"), format!("{compare_to:?}"))
}

#[macro_export]
macro_rules! create_upsert_trait {
    ($row:ident, $repo:ident, $change_log:path) => {
        impl crate::Upsert for $row {
            fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
                let _change_log_id = $repo::new(con).upsert_one(self)?;
                Ok(())
            }

            fn upsert(&self, con: &StorageConnection) -> Result<Option<i64>, RepositoryError> {
                let cursor_id = $repo::new(con).upsert_one(self)?;
                Ok(Some(cursor_id))
            }

            // Test only
            fn assert_upserted(&self, con: &StorageConnection) {
                assert_eq!(
                    $repo::new(con).find_one_by_id(&self.id),
                    Ok(Some(self.clone()))
                )
            }
        }
        impl<'a> $repo<'a> {
            pub fn upsert_one(&self, row: &$row) -> Result<i64, RepositoryError> {
                self._upsert_one(row)?;
                #[allow(unused_imports)]
                use crate::StoreAndNameLinkId;
                let (store_id, name_link_id_not_dsl) =
                    row.get_store_and_name_link_id(self.connection)?;

                let changelog_row = crate::ChangeLogInsertRow {
                    table_name: $change_log,
                    record_id: row.id.clone(),
                    row_action: crate::ChangelogAction::Upsert,
                    store_id,
                    name_link_id: name_link_id_not_dsl,
                };

                crate::ChangelogRepository::new(self.connection).insert(&changelog_row)
            }
        }
    };
}
