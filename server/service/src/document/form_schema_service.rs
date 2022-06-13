use repository::{FormSchema, FormSchemaRowRepository, RepositoryError};

use crate::service_provider::ServiceContext;

pub enum InsertFormSchemaError {
    DatabaseError(RepositoryError),
    SerializationError(String),
}
pub trait FormSchemaServiceTrait: Sync + Send {
    fn get_schema(
        &self,
        ctx: &ServiceContext,
        id: &str,
    ) -> Result<Option<FormSchema>, RepositoryError> {
        FormSchemaRowRepository::new(&ctx.connection).find_one_by_id(id)
    }

    fn insert(
        &self,
        ctx: &ServiceContext,
        schema: FormSchema,
    ) -> Result<FormSchema, InsertFormSchemaError> {
        let repo = FormSchemaRowRepository::new(&ctx.connection);
        repo.upsert_one(&schema)
            .map_err(|e| InsertFormSchemaError::DatabaseError(e))?;
        Ok(schema)
    }
}

pub struct FormSchemaService {}
impl FormSchemaServiceTrait for FormSchemaService {}
