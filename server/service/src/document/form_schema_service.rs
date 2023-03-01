use repository::{
    FormSchema, FormSchemaFilter, FormSchemaRepository, FormSchemaRowRepository, Pagination,
    RepositoryError,
};

use crate::service_provider::ServiceContext;

pub enum InsertFormSchemaError {
    DatabaseError(RepositoryError),
    SerializationError(String),
}

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

pub trait FormSchemaServiceTrait: Sync + Send {
    fn get_schema(
        &self,
        ctx: &ServiceContext,
        filter: Option<FormSchemaFilter>,
    ) -> Result<Option<FormSchema>, RepositoryError> {
        Ok(FormSchemaRepository::new(&ctx.connection)
            .query(Pagination::one(), filter, None)?
            .pop())
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
