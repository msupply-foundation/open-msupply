use repository::{JSONSchema, JsonSchemaRepository, RepositoryError};
use util::{canonical_json::CanonicalJsonValue, hash::sha256};

use crate::service_provider::ServiceContext;

pub enum InsertSchemaError {
    DatabaseError(RepositoryError),
    SerializationError(String),
}
pub trait JsonSchemaServiceTrait: Sync + Send {
    fn get_schema(&self, ctx: &ServiceContext, id: &str) -> Result<JSONSchema, RepositoryError> {
        JsonSchemaRepository::new(&ctx.connection).find_one_by_id(id)
    }

    fn insert_schema(
        &self,
        ctx: &ServiceContext,
        schema: String,
    ) -> Result<String, InsertSchemaError> {
        let schema: serde_json::Value = serde_json::from_str(&schema)
            .map_err(|e| InsertSchemaError::SerializationError(format!("{}", e)))?;
        let canonical_value = CanonicalJsonValue::from(schema.clone());
        let str = canonical_value.to_string();
        let id = sha256(&str);

        let repo = JsonSchemaRepository::new(&ctx.connection);
        repo.upsert_one(&JSONSchema {
            id: id.to_owned(),
            schema,
        })
        .map_err(|e| InsertSchemaError::DatabaseError(e))?;
        Ok(id)
    }
}

pub struct JsonSchemaService {}
impl JsonSchemaServiceTrait for JsonSchemaService {}
