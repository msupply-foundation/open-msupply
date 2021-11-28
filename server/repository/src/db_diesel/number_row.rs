use super::StorageConnection;

use crate::{
    repository_error::RepositoryError,
    schema::{diesel_schema::number::dsl as number_dsl, NumberRow},
};

use diesel::prelude::*;

pub struct NumberRowRepository<'a> {
    connection: &'a StorageConnection,
}

fn find_one_by_id_tx(
    con: &StorageConnection,
    counter_id: &str,
) -> Result<Option<NumberRow>, RepositoryError> {
    match number_dsl::number
        .filter(number_dsl::id.eq(counter_id))
        .first(&con.connection)
    {
        Ok(row) => Ok(Some(row)),
        Err(diesel::result::Error::NotFound) => Ok(None),
        Err(error) => Err(RepositoryError::from(error)),
    }
}

impl<'a> NumberRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        NumberRowRepository { connection }
    }

    /// Increments the counter and returns the updated row
    /// Note: its assumed that this call done in a transaction
    pub fn increment(&self, counter_id: &str) -> Result<NumberRow, RepositoryError> {
        Ok(self.connection.transaction_sync(|con| {
            match find_one_by_id_tx(con, counter_id)? {
                Some(mut row) => {
                    // update existing counter
                    row.value = row.value + 1;
                    diesel::update(number_dsl::number)
                        .set(&row)
                        .execute(&con.connection)?;
                    Ok(row)
                }
                None => {
                    // insert new counter
                    let row = NumberRow {
                        id: counter_id.to_string(),
                        value: 1,
                    };
                    diesel::insert_into(number_dsl::number)
                        .values(&row)
                        .execute(&con.connection)?;
                    Ok(row)
                }
            }
        })?)
    }

    pub fn find_one_by_id(&self, counter_id: &str) -> Result<Option<NumberRow>, RepositoryError> {
        find_one_by_id_tx(&self.connection, counter_id)
    }
}
