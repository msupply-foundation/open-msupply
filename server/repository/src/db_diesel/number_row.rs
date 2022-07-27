use super::{number_row::number::dsl as number_dsl, StorageConnection};

use crate::repository_error::RepositoryError;

use diesel::prelude::*;

use diesel_derive_enum::DbEnum;

table! {
    number (id) {
        id -> Text,
        value -> BigInt,
        store_id -> Text,
        #[sql_name = "type"] type_ -> crate::db_diesel::number_row::NumberRowTypeMapping,
    }
}

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum NumberRowType {
    InboundShipment,
    OutboundShipment,
    InventoryAdjustment,
    RequestRequisition,
    ResponseRequisition,
    Stocktake,
}

#[derive(Clone, Insertable, Queryable, Debug, PartialEq, Eq, AsChangeset)]
#[table_name = "number"]
pub struct NumberRow {
    pub id: String,
    pub value: i64,
    /// Note, store id will be needed mainly for sync.
    pub store_id: String,
    // Table
    #[column_name = "type_"]
    pub r#type: NumberRowType,
}

pub struct NumberRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> NumberRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NumberRowRepository { connection }
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<NumberRow>, RepositoryError> {
        let result = number_dsl::number
            .filter(number_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_one_by_type_and_store(
        &self,
        r#type: &NumberRowType,
        store_id: &str,
    ) -> Result<Option<NumberRow>, RepositoryError> {
        match number_dsl::number
            .filter(number_dsl::store_id.eq(store_id))
            .filter(number_dsl::type_.eq(r#type))
            .first(&self.connection.connection)
        {
            Ok(row) => Ok(Some(row)),
            Err(diesel::result::Error::NotFound) => Ok(None),
            Err(error) => Err(RepositoryError::from(error)),
        }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, number_row: &NumberRow) -> Result<(), RepositoryError> {
        diesel::insert_into(number_dsl::number)
            .values(number_row)
            .on_conflict(number_dsl::id)
            .do_update()
            .set(number_row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, number_row: &NumberRow) -> Result<(), RepositoryError> {
        let final_query = diesel::replace_into(number_dsl::number).values(number_row);

        // // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&final_query).to_string()
        // );

        final_query.execute(&self.connection.connection)?;
        Ok(())
    }
}
