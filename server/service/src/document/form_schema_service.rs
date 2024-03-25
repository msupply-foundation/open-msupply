use repository::{
    FormSchema, FormSchemaFilter, FormSchemaRepository, FormSchemaRowRepository, FormSchemaSort,
    PaginationOption, RepositoryError,
};

use crate::{
    get_default_pagination_unlimited, i64_to_u32, service_provider::ServiceContext, ListResult,
};

pub enum InsertFormSchemaError {
    DatabaseError(RepositoryError),
    SerializationError(String),
}

pub trait FormSchemaServiceTrait: Sync + Send {
    fn form_schemas(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<FormSchemaFilter>,
        sort: Option<FormSchemaSort>,
    ) -> Result<ListResult<FormSchema>, RepositoryError> {
        let pagination = get_default_pagination_unlimited(pagination);
        let repository = FormSchemaRepository::new(&ctx.connection);
        let rows = repository.query(pagination, filter.clone(), sort)?;

        Ok(ListResult {
            rows,
            count: i64_to_u32(repository.count(filter)?),
        })
    }

    fn insert(
        &self,
        ctx: &ServiceContext,
        schema: FormSchema,
    ) -> Result<FormSchema, InsertFormSchemaError> {
        let repo = FormSchemaRowRepository::new(&ctx.connection);
        repo.upsert_one(&schema)
            .map_err(InsertFormSchemaError::DatabaseError)?;
        Ok(schema)
    }
}

pub struct FormSchemaService {}
impl FormSchemaServiceTrait for FormSchemaService {}
