use std::convert::TryFrom;
use std::fmt;

use super::{number_row::number::dsl as number_dsl, StorageConnection};
use util::uuid::uuid;

use crate::repository_error::RepositoryError;

use diesel::result::Error::NotFound;
use diesel::{prelude::*, sql_query, sql_types::Text};

use diesel::sql_types::BigInt;

table! {
    number (id) {
        id -> Text,
        value -> BigInt,
        store_id -> Text,
        #[sql_name = "type"] type_ -> Text,
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum NumberRowTypeError {
    UnknownTypePrefix(String),
    MissingTypePrefix,
}

#[derive(AsExpression, Debug, Clone, PartialEq, Eq)]
pub enum NumberRowType {
    InboundShipment,
    OutboundShipment,
    InventoryAdjustment,
    RequestRequisition,
    ResponseRequisition,
    Stocktake,
    Program(String),
}

impl fmt::Display for NumberRowType {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            NumberRowType::InboundShipment => write!(f, "INBOUND_SHIPMENT"),
            NumberRowType::OutboundShipment => write!(f, "OUTBOUND_SHIPMENT"),
            NumberRowType::InventoryAdjustment => write!(f, "INVENTORY_ADJUSTMENT"),
            NumberRowType::RequestRequisition => write!(f, "REQUEST_REQUISITION"),
            NumberRowType::ResponseRequisition => write!(f, "RESPONSE_REQUISITION"),
            NumberRowType::Stocktake => write!(f, "STOCKTAKE"),
            NumberRowType::Program(custom_string) => write!(f, "PROGRAM_{}", custom_string),
        }
    }
}

impl TryFrom<String> for NumberRowType {
    type Error = NumberRowTypeError;

    fn try_from(s: String) -> Result<Self, NumberRowTypeError> {
        match s.as_str() {
            "INBOUND_SHIPMENT" => Ok(NumberRowType::InboundShipment),
            "OUTBOUND_SHIPMENT" => Ok(NumberRowType::OutboundShipment),
            "INVENTORY_ADJUSTMENT" => Ok(NumberRowType::InventoryAdjustment),
            "REQUEST_REQUISITION" => Ok(NumberRowType::RequestRequisition),
            "RESPONSE_REQUISITION" => Ok(NumberRowType::ResponseRequisition),
            "STOCKTAKE" => Ok(NumberRowType::Stocktake),
            _ => match s.split_once('_') {
                Some((prefix, custom_string)) => {
                    if prefix == "PROGRAM" {
                        Ok(NumberRowType::Program(custom_string.to_string()))
                    } else {
                        Err(NumberRowTypeError::UnknownTypePrefix(prefix.to_string()))
                    }
                }
                None => Err(NumberRowTypeError::MissingTypePrefix),
            },
        }
    }
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
    pub r#type: String,
}
pub struct NumberRowRepository<'a> {
    connection: &'a StorageConnection,
}

#[derive(QueryableByName, Queryable, PartialEq, Debug)]
pub struct NextNumber {
    #[column_name = "value"]
    #[sql_type = "BigInt"]
    pub number: i64,
}

// feature sqlite
#[cfg(not(feature = "postgres"))]
const NUMBER_INSERT_QUERY: &'static str =
    "INSERT INTO number (id, value, store_id, type) VALUES ($1, $2, $3, $4) RETURNING value;";

// feature postgres
// We need to use the ON CONFLICT DO NOTHING Clause for postgres just in case 2 threads insert at the same time (SQLite <on disk> does not need this as it only allows a single write transaction at a time).
// Without this postgres will throw a unique constraint violation error and rollback the transaction, which is hard to recover from, instead we just ignore the error and check if it returned a value
#[cfg(feature = "postgres")]
const NUMBER_INSERT_QUERY: &'static str = "INSERT INTO number (id, value, store_id, type) VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING RETURNING value;";

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

    pub fn get_next_number_for_type_and_store(
        &self,
        r#type: &NumberRowType,
        store_id: &str,
        next_number: Option<i64>,
    ) -> Result<NextNumber, RepositoryError> {
        // 1. First we try to just grab the next number from the database, in most cases this should work and be the fast.

        let update_query = sql_query(r#"UPDATE number SET value = value+1 WHERE store_id = $1 and type = $2 RETURNING value;"#)
            .bind::<Text, _>(store_id)
            .bind::<Text, _>(r#type.to_string());

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&update_query).to_string()
        // );
        let update_result = update_query
            .clone()
            .get_result::<NextNumber>(&self.connection.connection);

        match update_result {
            Ok(result) => Ok(result),
            Err(NotFound) => {
                // 2. There was no record to update, so we need to insert a new one.
                let insert_query = sql_query(NUMBER_INSERT_QUERY)
                    .bind::<Text, _>(uuid())
                    .bind::<BigInt, _>(next_number.unwrap_or(1))
                    .bind::<Text, _>(store_id)
                    .bind::<Text, _>(r#type.to_string());

                match insert_query.get_result::<NextNumber>(&self.connection.connection) {
                    Ok(result) => Ok(result),
                    Err(NotFound) => {
                        // 3. If we got here another thread inserted the record before we we able to (we know this because nothing was returned for the insert)
                        // We should now be able to do the same 'update returning' query as before to get our new number.

                        let result =
                            update_query.get_result::<NextNumber>(&self.connection.connection)?;
                        Ok(result)
                    }
                    Err(e) => Err(RepositoryError::from(e)),
                }
            }
            Err(e) => Err(RepositoryError::from(e)),
        }
    }

    pub fn find_one_by_type_and_store(
        &self,
        r#type: &NumberRowType,
        store_id: &str,
    ) -> Result<Option<NumberRow>, RepositoryError> {
        match number_dsl::number
            .filter(number_dsl::store_id.eq(store_id))
            .filter(number_dsl::type_.eq(r#type.to_string()))
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

    pub fn delete(&self, number_id: &str) -> Result<(), RepositoryError> {
        diesel::delete(number_dsl::number)
            .filter(number_dsl::id.eq(number_id))
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_many_by_store_id(
        &self,
        store_ids: &[String],
    ) -> Result<Vec<NumberRow>, RepositoryError> {
        let result = number_dsl::number
            .filter(number_dsl::store_id.eq_any(store_ids))
            .load(&self.connection.connection)?;
        Ok(result)
    }
}

#[cfg(test)]
mod number_row_mapping_test {
    use std::convert::TryFrom;

    use crate::NumberRowType;

    #[test]
    fn test_number_row_type() {
        // The purpose of this test is primarily to remind you to update both the to_string AND try_from functions if any new mappings are added to NumberRowType
        // the try_from function uses a wild card match so theoretically could be missed if you add a new mapping

        let number_row_type = NumberRowType::Program("EXAMPLE_TEST".to_string());
        match number_row_type {
            NumberRowType::InboundShipment => {
                assert!(
                    NumberRowType::try_from(NumberRowType::InboundShipment.to_string()).unwrap()
                        == NumberRowType::InboundShipment
                )
            }
            NumberRowType::OutboundShipment => {
                assert!(
                    NumberRowType::try_from(NumberRowType::OutboundShipment.to_string()).unwrap()
                        == NumberRowType::OutboundShipment
                )
            }
            NumberRowType::InventoryAdjustment => {
                assert!(
                    NumberRowType::try_from(NumberRowType::InventoryAdjustment.to_string())
                        .unwrap()
                        == NumberRowType::InventoryAdjustment
                )
            }
            NumberRowType::RequestRequisition => {
                assert!(
                    NumberRowType::try_from(NumberRowType::RequestRequisition.to_string()).unwrap()
                        == NumberRowType::RequestRequisition
                )
            }
            NumberRowType::ResponseRequisition => {
                assert!(
                    NumberRowType::try_from(NumberRowType::ResponseRequisition.to_string())
                        .unwrap()
                        == NumberRowType::ResponseRequisition
                )
            }
            NumberRowType::Stocktake => {
                assert!(
                    NumberRowType::try_from(NumberRowType::Stocktake.to_string()).unwrap()
                        == NumberRowType::Stocktake
                )
            }
            NumberRowType::Program(s) => {
                assert!(
                    NumberRowType::try_from(NumberRowType::Program(s.clone()).to_string()).unwrap()
                        == NumberRowType::Program(s)
                )
            }
        }
    }
}
