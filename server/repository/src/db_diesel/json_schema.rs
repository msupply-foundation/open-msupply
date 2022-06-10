use super::StorageConnection;

use crate::RepositoryError;

use diesel::prelude::*;
use serde::{Deserialize, Serialize};

table! {
    json_schema (id) {
        id -> Text,
        schema -> Text,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[table_name = "json_schema"]
pub struct JSONSchemaRow {
    /// The json schema id
    pub id: String,
    /// Document path and name
    pub schema: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct JSONSchema {
    pub id: String,
    pub schema: serde_json::Value,
}

pub struct JsonSchemaRepository<'a> {
    connection: &'a StorageConnection,
}

fn schema_from_row(schema_row: JSONSchemaRow) -> Result<JSONSchema, RepositoryError> {
    let parsed_schema: serde_json::Value =
        serde_json::from_str(&schema_row.schema).map_err(|err| RepositoryError::DBError {
            msg: "Invalid schema data".to_string(),
            extra: format!("{}", err),
        })?;
    Ok(JSONSchema {
        id: schema_row.id,
        schema: parsed_schema,
    })
}

fn row_from_schema(schema: &JSONSchema) -> Result<JSONSchemaRow, RepositoryError> {
    let data = serde_json::to_string(&schema.schema).map_err(|err| RepositoryError::DBError {
        msg: "Can't serialize data".to_string(),
        extra: format!("{}", err),
    })?;
    Ok(JSONSchemaRow {
        id: schema.id.to_owned(),
        schema: data,
    })
}

impl<'a> JsonSchemaRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        JsonSchemaRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn upsert_one(&self, schema: &JSONSchema) -> Result<(), RepositoryError> {
        let row = row_from_schema(schema)?;
        diesel::insert_into(json_schema::dsl::json_schema)
            .values(&row)
            .on_conflict(json_schema::dsl::id)
            .do_update()
            .set(&row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn upsert_one(&self, schema: &JSONSchema) -> Result<(), RepositoryError> {
        let row = row_from_schema(schema)?;
        diesel::replace_into(json_schema::dsl::json_schema)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, schema_id: &str) -> Result<JSONSchema, RepositoryError> {
        let row = json_schema::dsl::json_schema
            .filter(json_schema::dsl::id.eq(schema_id))
            .first(&self.connection.connection)?;

        schema_from_row(row)
    }

    pub fn find_many_by_ids(&self, ids: &[String]) -> Result<Vec<JSONSchema>, RepositoryError> {
        let rows: Vec<JSONSchemaRow> = json_schema::dsl::json_schema
            .filter(json_schema::dsl::id.eq_any(ids))
            .load(&self.connection.connection)?;
        let mut result = Vec::<JSONSchema>::new();
        for row in rows {
            result.push(schema_from_row(row)?);
        }
        Ok(result)
    }
}
