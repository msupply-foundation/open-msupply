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
    let mut boxed_buffer = Box::new(Vec::new());
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

pub trait Upsert: DebugTrait {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError>;
    // Test only
    fn assert_upserted(&self, con: &StorageConnection);
    // Test only, can be used to drill down to concrete type (see test below)
    // also casting to any must be implemented by concrete type to be able to downcast to it
    // This is needed for integration test (where test record is generated for inventory adjustment, but id is not know until site is created)
    fn as_mut_any(&mut self) -> Option<&mut dyn Any> {
        None
    }
}

#[test]
fn downcast_example() {
    let mut boxed: Vec<Box<dyn Upsert>> = vec![
        Box::new(InvoiceRow::default()),
        Box::new(InvoiceLineRow::default()),
    ];

    for record in &mut boxed {
        let Some(mut_invoice) = record
            .as_mut_any()
            .map(|any| any.downcast_mut::<InvoiceRow>())
            .flatten() else  {
            continue;
        };

        mut_invoice.id = "changed_id".to_string()
    }

    let compare_to: Vec<Box<dyn Upsert>> = vec![
        Box::new(InvoiceRow {
            id: "changed_id".to_string(),
            ..Default::default()
        }),
        Box::new(InvoiceLineRow::default()),
    ];

    assert_eq!(format!("{boxed:?}"), format!("{compare_to:?}"))
}
