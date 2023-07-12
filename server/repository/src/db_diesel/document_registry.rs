use super::{
    document_registry_row::{document_registry, document_registry::dsl as document_registry_dsl},
    form_schema_row::{form_schema, form_schema::dsl as form_schema_dsl},
    StorageConnection,
};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort, apply_sort_no_case},
    DocumentRegistryConfig, DocumentRegistryRow, DocumentRegistryType, FormSchemaRow,
};

use crate::{repository_error::RepositoryError, DBType, EqualFilter, Pagination, Sort};
use diesel::{
    dsl::{InnerJoin, IntoBoxed},
    prelude::*,
};

#[derive(Clone, PartialEq, Debug)]
pub struct DocumentRegistryFilter {
    pub id: Option<EqualFilter<String>>,
    pub document_type: Option<EqualFilter<String>>,
    pub document_context: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<DocumentRegistryType>>,
    pub parent_id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum DocumentRegistrySortField {
    DocumentType,
    Type,
}

pub type DocumentRegistrySort = Sort<DocumentRegistrySortField>;

pub struct DocumentRegistryRepository<'a> {
    connection: &'a StorageConnection,
}

#[derive(Debug, PartialEq, Clone)]
pub struct DocumentRegistry {
    pub id: String,
    pub parent_id: Option<String>,
    pub document_type: String,
    pub document_context: String,
    pub r#type: DocumentRegistryType,
    pub name: Option<String>,
    pub form_schema_id: String,
    pub json_schema: serde_json::Value,
    pub ui_schema_type: String,
    pub ui_schema: serde_json::Value,
    pub config: Option<DocumentRegistryConfig>,
}

impl<'a> DocumentRegistryRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DocumentRegistryRepository { connection }
    }

    pub fn count(&self, filter: Option<DocumentRegistryFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: DocumentRegistryFilter,
    ) -> Result<Vec<DocumentRegistry>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<DocumentRegistryFilter>,
        sort: Option<DocumentRegistrySort>,
    ) -> Result<Vec<DocumentRegistry>, RepositoryError> {
        // TODO (beyond M2), check that store_id matches current store
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                DocumentRegistrySortField::DocumentType => {
                    apply_sort_no_case!(query, sort, document_registry_dsl::document_type)
                }
                DocumentRegistrySortField::Type => {
                    apply_sort!(query, sort, document_registry_dsl::type_)
                }
            }
        } else {
            query = query.order(document_registry_dsl::id.asc())
        }

        let result: Result<Vec<DocumentRegistry>, RepositoryError> = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<DocumentRegistrySchemaJoin>(&self.connection.connection)?
            .into_iter()
            .map(|data| to_domain(data))
            .collect();

        result
    }
}

type DocumentRegistrySchemaJoin = (DocumentRegistryRow, FormSchemaRow);

type BoxedDocRegistryQuery =
    IntoBoxed<'static, InnerJoin<document_registry::table, form_schema::table>, DBType>;

fn create_filtered_query(filter: Option<DocumentRegistryFilter>) -> BoxedDocRegistryQuery {
    let mut query = document_registry::table
        .inner_join(form_schema_dsl::form_schema)
        .into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, document_registry_dsl::id);
        apply_equal_filter!(
            query,
            filter.document_type,
            document_registry_dsl::document_type
        );
        apply_equal_filter!(
            query,
            filter.document_context,
            document_registry_dsl::document_context
        );
        apply_equal_filter!(query, filter.r#type, document_registry_dsl::type_);
        apply_equal_filter!(query, filter.parent_id, document_registry_dsl::parent_id);
    }

    query
}

impl DocumentRegistryFilter {
    pub fn new() -> DocumentRegistryFilter {
        DocumentRegistryFilter {
            id: None,
            document_type: None,
            document_context: None,
            r#type: None,
            parent_id: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn document_type(mut self, filter: EqualFilter<String>) -> Self {
        self.document_type = Some(filter);
        self
    }

    pub fn document_context(mut self, filter: EqualFilter<String>) -> Self {
        self.document_context = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<DocumentRegistryType>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn parent_id(mut self, filter: EqualFilter<String>) -> Self {
        self.parent_id = Some(filter);
        self
    }
}

fn to_domain(data: DocumentRegistrySchemaJoin) -> Result<DocumentRegistry, RepositoryError> {
    let (
        DocumentRegistryRow {
            id,
            r#type,
            document_type,
            document_context,
            name,
            parent_id,
            form_schema_id: _,
            config,
        },
        form_schema,
    ) = data;
    let json_schema =
        serde_json::from_str(&form_schema.json_schema).map_err(|err| RepositoryError::DBError {
            msg: "Invalid json schema".to_string(),
            extra: format!("{}", err),
        })?;
    let ui_schema =
        serde_json::from_str(&form_schema.ui_schema).map_err(|err| RepositoryError::DBError {
            msg: "Invalid ui schema".to_string(),
            extra: format!("{}", err),
        })?;
    let config = if let Some(config) = config {
        let config = serde_json::from_str(&config).map_err(|err| RepositoryError::DBError {
            msg: "Invalid document config".to_string(),
            extra: format!("{}", err),
        })?;
        Some(config)
    } else {
        None
    };

    Ok(DocumentRegistry {
        id,
        parent_id,
        document_type,
        document_context,
        r#type,
        name,
        form_schema_id: form_schema.id,
        json_schema,
        ui_schema_type: form_schema.r#type,
        ui_schema,
        config,
    })
}

impl DocumentRegistryType {
    pub fn equal_to(&self) -> EqualFilter<DocumentRegistryType> {
        EqualFilter {
            equal_to: Some(self.clone()),
            not_equal_to: None,
            equal_any: None,
            not_equal_all: None,
            equal_any_or_null: None,
            is_null: None,
        }
    }
}
