use super::{
    form_schema_row::form_schema::{self, dsl as form_schema_dsl},
    StorageConnection,
};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort},
    schema_from_row, DBType, EqualFilter, FormSchemaJson, FormSchemaRow, Pagination,
    RepositoryError, Sort,
};

use diesel::{dsl::IntoBoxed, prelude::*};

pub type FormSchema = FormSchemaJson;

pub enum FormSchemaSortField {
    Id,
}

#[derive(Clone, Default)]
pub struct FormSchemaFilter {
    pub id: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<String>>,
}

pub type FormSchemaSort = Sort<FormSchemaSortField>;

pub struct FormSchemaRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> FormSchemaRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        FormSchemaRepository { connection }
    }

    pub fn count(&self, filter: Option<FormSchemaFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: FormSchemaFilter,
    ) -> Result<Vec<FormSchema>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<FormSchemaFilter>,
        sort: Option<FormSchemaSort>,
    ) -> Result<Vec<FormSchema>, RepositoryError> {
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                FormSchemaSortField::Id => {
                    apply_sort!(query, sort, form_schema_dsl::id)
                }
            }
        } else {
            query = query.order(form_schema_dsl::id.asc())
        }

        let rows = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<FormSchemaRow>(self.connection.lock().connection())?;

        let mut result = Vec::<FormSchemaJson>::new();
        for row in rows {
            result.push(schema_from_row(row)?);
        }

        Ok(result)
    }
}

type BoxedFormSchemaQuery = IntoBoxed<'static, form_schema::table, DBType>;

fn create_filtered_query(filter: Option<FormSchemaFilter>) -> BoxedFormSchemaQuery {
    let mut query = form_schema_dsl::form_schema.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, form_schema_dsl::id);
        apply_equal_filter!(query, filter.r#type, form_schema_dsl::type_);
    }

    query
}

impl FormSchemaFilter {
    pub fn new() -> FormSchemaFilter {
        Default::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<String>) -> Self {
        self.r#type = Some(filter);
        self
    }
}
