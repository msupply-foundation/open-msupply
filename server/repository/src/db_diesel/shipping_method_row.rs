use crate::{RepositoryError, StorageConnection};
use chrono::NaiveDateTime;
use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    shipping_method (id) {
        id -> Text,
        method -> Text,
        deleted_datetime -> Nullable<Timestamp>
    }
}

#[derive(
    Clone, Insertable, Queryable, Debug, AsChangeset, Serialize, Deserialize, Default, PartialEq,
)]
#[diesel(table_name = shipping_method)]
#[diesel(treat_none_as_null = true)]
pub struct ShippingMethodRow {
    pub id: String,
    pub method: String,
    pub deleted_datetime: Option<NaiveDateTime>,
}

pub struct ShippingMethodRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ShippingMethodRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ShippingMethodRowRepository { connection }
    }

    pub fn upsert_one(&self, row: &ShippingMethodRow) -> Result<(), RepositoryError> {
        diesel::insert_into(shipping_method::table)
            .values(row)
            .on_conflict(shipping_method::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn find_all(&self) -> Result<Vec<ShippingMethodRow>, RepositoryError> {
        let results = shipping_method::table
            .load::<ShippingMethodRow>(self.connection.lock().connection())?;
        Ok(results)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<ShippingMethodRow>, RepositoryError> {
        let result = shipping_method::table
            .filter(shipping_method::id.eq(id))
            .first::<ShippingMethodRow>(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }
}
