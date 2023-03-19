use super::StorageConnection;

use crate::db_diesel::form_schema_row::form_schema;
use crate::db_diesel::name_row::name;
use crate::diesel_macros::{
    apply_date_time_filter, apply_equal_filter, apply_simple_string_filter, apply_sort,
    apply_string_filter,
};
use crate::{
    DBType, DatetimeFilter, EqualFilter, Pagination, RepositoryError, SimpleStringFilter, Sort,
    StringFilter,
};

use chrono::{DateTime, NaiveDateTime, Utc};
use diesel::helper_types::IntoBoxed;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    document (id) {
        id -> Text,
        name -> Text,
        parent_ids -> Text,
        user_id -> Text,
        datetime -> Timestamp,
        #[sql_name = "type"] type_ -> Text,
        data -> Text,
        form_schema_id -> Nullable<Text>,
        status -> crate::db_diesel::document::DocumentStatusMapping,
        owner_name_id -> Nullable<Text>,
        context -> Nullable<Text>,
    }
}

// view of the document table that only shows the latest document version
table! {
    latest_document (id) {
        id -> Text,
        name -> Text,
        parent_ids -> Text,
        user_id -> Text,
        datetime -> Timestamp,
        #[sql_name = "type"] type_ -> Text,
        data -> Text,
        form_schema_id -> Nullable<Text>,
        status -> crate::db_diesel::document::DocumentStatusMapping,
        owner_name_id -> Nullable<Text>,
        context -> Nullable<Text>,
    }
}

joinable!(document -> form_schema (form_schema_id));
joinable!(document -> name (owner_name_id));

allow_tables_to_appear_in_same_query!(document, form_schema);
allow_tables_to_appear_in_same_query!(document, name);

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum DocumentStatus {
    Active,
    Deleted,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[table_name = "document"]
pub struct DocumentRow {
    /// The document data hash
    pub id: String,
    /// Document path and name
    pub name: String,
    /// Stringified array of parents
    pub parent_ids: String,
    /// Id of the author who edited this document version
    pub user_id: String,
    /// The timestamp of this document version
    pub datetime: NaiveDateTime,
    /// Type of the containing data
    #[column_name = "type_"]
    pub r#type: String,
    /// The actual document data
    pub data: String,
    /// JSON schema id containing the schema for the data
    pub form_schema_id: Option<String>,
    /// Soft deletion status
    pub status: DocumentStatus,
    /// For example, the patient who owns the document
    pub owner_name_id: Option<String>,
    /// For example, program this document belongs to
    pub context: Option<String>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct Document {
    /// The document data hash
    pub id: String,
    /// Document path and name
    pub name: String,
    /// Document parents
    pub parent_ids: Vec<String>,
    /// Id of the author who edited this document version
    pub user_id: String,
    /// The timestamp of this document version
    pub datetime: DateTime<Utc>,
    /// Type of the containing data
    pub r#type: String,
    /// The actual document data
    pub data: serde_json::Value,
    pub form_schema_id: Option<String>,
    pub status: DocumentStatus,
    pub owner_name_id: Option<String>,
    pub context: Option<String>,
}

#[derive(Clone)]
pub struct DocumentFilter {
    pub name: Option<StringFilter>,
    pub r#type: Option<EqualFilter<String>>,
    pub datetime: Option<DatetimeFilter>,
    pub owner: Option<EqualFilter<String>>,
    pub context: Option<EqualFilter<String>>,
    pub data: Option<SimpleStringFilter>,
}

impl DocumentFilter {
    pub fn new() -> Self {
        DocumentFilter {
            name: None,
            r#type: None,
            datetime: None,
            data: None,
            owner: None,
            context: None,
        }
    }

    pub fn name(mut self, value: StringFilter) -> Self {
        self.name = Some(value);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<String>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn datetime(mut self, filter: DatetimeFilter) -> Self {
        self.datetime = Some(filter);
        self
    }

    pub fn owner(mut self, filter: EqualFilter<String>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn context(mut self, filter: EqualFilter<String>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn data(mut self, filter: SimpleStringFilter) -> Self {
        self.data = Some(filter);
        self
    }
}

pub enum DocumentSortField {
    Name,
    Type,
    Owner,
    Context,
    Datetime,
}

pub type DocumentSort = Sort<DocumentSortField>;

type BoxedDocumentQuery = IntoBoxed<'static, latest_document::table, DBType>;

fn create_latest_filtered_query<'a>(filter: Option<DocumentFilter>) -> BoxedDocumentQuery {
    let mut query = latest_document::dsl::latest_document.into_boxed();

    if let Some(f) = filter {
        let DocumentFilter {
            name,
            r#type,
            datetime,
            owner,
            context,
            data,
        } = f;

        apply_string_filter!(query, name, latest_document::dsl::name);
        apply_equal_filter!(query, r#type, latest_document::dsl::type_);
        apply_date_time_filter!(query, datetime, latest_document::dsl::datetime);
        apply_equal_filter!(query, owner, latest_document::dsl::owner_name_id);
        apply_equal_filter!(query, context, latest_document::dsl::context);
        apply_simple_string_filter!(query, data, latest_document::dsl::data);
    }
    query
}

pub struct DocumentRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DocumentRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DocumentRepository { connection }
    }

    /// Inserts a document
    pub fn insert(&self, doc: &Document) -> Result<(), RepositoryError> {
        diesel::insert_into(document::dsl::document)
            .values(doc.to_row()?)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    /// Get a specific document version
    pub fn find_one_by_id(&self, document_id: &str) -> Result<Option<Document>, RepositoryError> {
        let row: Option<DocumentRow> = document::dsl::document
            .filter(document::dsl::id.eq(document_id))
            .first(&self.connection.connection)
            .optional()?;

        Ok(match row {
            Some(row) => Some(row.to_document()?),
            None => None,
        })
    }

    pub fn count(&self, filter: Option<DocumentFilter>) -> Result<i64, RepositoryError> {
        let query = create_latest_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
    }

    /// Get the latest version of some documents
    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<DocumentFilter>,
        sort: Option<DocumentSort>,
    ) -> Result<Vec<Document>, RepositoryError> {
        let mut query = create_latest_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                DocumentSortField::Name => {
                    apply_sort!(query, sort, latest_document::dsl::name)
                }
                DocumentSortField::Type => {
                    apply_sort!(query, sort, latest_document::dsl::type_)
                }
                DocumentSortField::Owner => {
                    apply_sort!(query, sort, latest_document::dsl::owner_name_id)
                }
                DocumentSortField::Context => {
                    apply_sort!(query, sort, latest_document::dsl::context)
                }
                DocumentSortField::Datetime => {
                    apply_sort!(query, sort, latest_document::dsl::datetime)
                }
            }
        } else {
            query = query.order(latest_document::dsl::datetime.desc())
        }

        let rows: Vec<DocumentRow> = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load(&self.connection.connection)?;

        let mut result = Vec::<Document>::new();
        for row in rows {
            result.push(row.to_document()?);
        }
        Ok(result)
    }

    /// Gets all document versions
    pub fn document_history(
        &self,
        filter: Option<DocumentFilter>,
    ) -> Result<Vec<Document>, RepositoryError> {
        let mut query = document::dsl::document.into_boxed();
        if let Some(f) = filter {
            let DocumentFilter {
                name,
                r#type,
                datetime,
                owner,
                context,
                data,
            } = f;

            apply_string_filter!(query, name, document::dsl::name);
            apply_equal_filter!(query, r#type, document::dsl::type_);
            apply_date_time_filter!(query, datetime, document::dsl::datetime);
            apply_equal_filter!(query, owner, document::dsl::owner_name_id);
            apply_equal_filter!(query, context, document::dsl::context);
            apply_simple_string_filter!(query, data, document::dsl::data);
        }
        let rows: Vec<DocumentRow> = query
            .order(document::dsl::datetime.desc())
            .load(&self.connection.connection)?;

        let mut result = Vec::<Document>::new();
        for row in rows {
            result.push(row.to_document()?);
        }
        Ok(result)
    }
}

impl DocumentRow {
    pub fn to_document(self) -> Result<Document, RepositoryError> {
        let DocumentRow {
            id,
            name,
            parent_ids,
            user_id,
            datetime,
            r#type,
            data,
            form_schema_id,
            status,
            owner_name_id,
            context,
        } = self;

        let parents: Vec<String> =
            serde_json::from_str(&parent_ids).map_err(|err| RepositoryError::DBError {
                msg: "Invalid parents data".to_string(),
                extra: format!("{}", err),
            })?;
        let data: serde_json::Value =
            serde_json::from_str(&data).map_err(|err| RepositoryError::DBError {
                msg: "Invalid data".to_string(),
                extra: format!("{}", err),
            })?;

        let document = Document {
            id,
            name,
            parent_ids: parents,
            user_id,
            datetime: DateTime::<Utc>::from_utc(datetime, Utc),
            r#type,
            data,
            form_schema_id,
            status,
            owner_name_id,
            context,
        };

        Ok(document)
    }
}

impl Document {
    pub fn to_row(&self) -> Result<DocumentRow, RepositoryError> {
        let parents =
            serde_json::to_string(&self.parent_ids).map_err(|err| RepositoryError::DBError {
                msg: "Can't serialize parents".to_string(),
                extra: format!("{}", err),
            })?;
        let data = serde_json::to_string(&self.data).map_err(|err| RepositoryError::DBError {
            msg: "Can't serialize data".to_string(),
            extra: format!("{}", err),
        })?;
        Ok(DocumentRow {
            id: self.id.to_owned(),
            name: self.name.to_owned(),
            parent_ids: parents,
            user_id: self.user_id.to_owned(),
            datetime: self.datetime.naive_utc(),
            r#type: self.r#type.to_owned(),
            data,
            form_schema_id: self.form_schema_id.clone(),
            status: self.status.to_owned(),
            owner_name_id: self.owner_name_id.to_owned(),
            context: self.context.to_owned(),
        })
    }
}
