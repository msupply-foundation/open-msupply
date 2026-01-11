use crate::{RepositoryError, StorageConnection};
use serde::{de::DeserializeOwned, Serialize};

pub trait Record
where
    Self: Sized,
{
    // fn table_name(&self) -> &'static str;
    fn find_by_id(
        connection: &StorageConnection,
        id: &str,
    ) -> Result<Option<Self>, RepositoryError>; // fn upsert(&self) -> bool;
    fn upsert_internal(&self, connection: &StorageConnection) -> Result<(), RepositoryError>;
    fn get_id(&self) -> &str;
}

#[macro_export]
macro_rules! impl_record {
    (
        struct: $struct_name:ident,
        table: $table_mod:ident,
        id_field: $id_field:ident
    ) => {
        impl $crate::syncv7::Record for $struct_name {
            fn find_by_id(
                connection: &$crate::StorageConnection,
                record_id: &str,
            ) -> Result<Option<Self>, $crate::RepositoryError> {
                use diesel::prelude::*;
                let result = $table_mod::table
                    .filter($table_mod::$id_field.eq(record_id))
                    .first::<$struct_name>(connection.lock().connection())
                    .optional()?;

                Ok(result)
            }

            fn get_id(&self) -> &str {
                &self.$id_field
            }

            fn upsert_internal(
                &self,
                connection: &$crate::StorageConnection,
            ) -> Result<(), $crate::RepositoryError> {
                use diesel::prelude::*;
                diesel::insert_into($table_mod::table)
                    .values(self)
                    .on_conflict($table_mod::$id_field)
                    .do_update()
                    .set(self)
                    .execute(connection.lock().connection())?;
                Ok(())
            }
        }
    };
}

pub(crate) use impl_record;
