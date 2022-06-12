use repository::{FormSchemaRowRepository, JSONSchema, RepositoryError};
use util::{canonical_json::canonical_json, hash::sha256};

use crate::service_provider::ServiceContext;

pub enum InsertSchemaError {
    DatabaseError(RepositoryError),
    SerializationError(String),
}
pub trait JsonSchemaServiceTrait: Sync + Send {
    fn get_schema(
        &self,
        ctx: &ServiceContext,
        id: &str,
    ) -> Result<Option<JSONSchema>, RepositoryError> {
        FormSchemaRowRepository::new(&ctx.connection).find_one_by_id(id)
    }

    fn insert_schema(
        &self,
        ctx: &ServiceContext,
        r#type: String,
        json_schema: String,
        ui_schema: String,
    ) -> Result<String, InsertSchemaError> {
        let json_schema: serde_json::Value = serde_json::from_str(&json_schema)
            .map_err(|e| InsertSchemaError::SerializationError(format!("{}", e)))?;
        let str = canonical_json(&json_schema);
        let id = sha256(&str);
        let ui_schema: serde_json::Value = serde_json::from_str(&ui_schema)
            .map_err(|e| InsertSchemaError::SerializationError(format!("{}", e)))?;

        let repo = FormSchemaRowRepository::new(&ctx.connection);
        repo.upsert_one(&JSONSchema {
            id: id.to_owned(),
            r#type: r#type.to_owned(),
            json_schema,
            ui_schema,
        })
        .map_err(|e| InsertSchemaError::DatabaseError(e))?;
        Ok(id)
    }
}

pub struct JsonSchemaService {}
impl JsonSchemaServiceTrait for JsonSchemaService {}
