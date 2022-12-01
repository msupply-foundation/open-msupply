use super::StorageConnection;

use crate::db_diesel::form_schema_row::form_schema;
use crate::db_diesel::name_row::name;
use crate::diesel_macros::{apply_equal_filter, apply_string_filter};
use crate::{EqualFilter, RepositoryError, StringFilter};

use chrono::{DateTime, NaiveDateTime, Utc};
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    document (id) {
        id -> Text,
        name -> Text,
        parent_ids -> Text,
        user_id -> Text,
        timestamp -> Timestamp,
        #[sql_name = "type"] type_ -> Text,
        data -> Text,
        schema_id -> Nullable<Text>,
        status -> crate::db_diesel::document::DocumentStatusMapping,
        comment -> Nullable<Text>,
        owner -> Nullable<Text>,
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
        timestamp -> Timestamp,
        #[sql_name = "type"] type_ -> Text,
        data -> Text,
        schema_id -> Nullable<Text>,
        status -> crate::db_diesel::document::DocumentStatusMapping,
        comment -> Nullable<Text>,
        owner -> Nullable<Text>,
        context -> Nullable<Text>,
    }
}

joinable!(document -> form_schema (schema_id));
joinable!(document -> name (owner));

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
    pub timestamp: NaiveDateTime,
    /// Type of the containing data
    #[column_name = "type_"]
    pub r#type: String,
    /// The actual document data
    pub data: String,
    /// JSON schema id containing the schema for the data
    pub schema_id: Option<String>,
    // Soft deletion status
    pub status: DocumentStatus,
    // Deletion comment
    pub comment: Option<String>,
    // Patient who owns the document
    pub owner: Option<String>,
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
    pub timestamp: DateTime<Utc>,
    /// Type of the containing data
    pub r#type: String,
    /// The actual document data
    pub data: serde_json::Value,
    pub schema_id: Option<String>,
    pub status: DocumentStatus,
    pub comment: Option<String>,
    pub owner: Option<String>,
    pub context: Option<String>,
}

#[derive(Clone)]
pub struct DocumentFilter {
    pub name: Option<StringFilter>,
    pub r#type: Option<EqualFilter<String>>,
    pub owner: Option<EqualFilter<String>>,
    pub context: Option<EqualFilter<String>>,
}

impl DocumentFilter {
    pub fn new() -> Self {
        DocumentFilter {
            name: None,
            r#type: None,
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

    pub fn owner(mut self, filter: EqualFilter<String>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn context(mut self, filter: EqualFilter<String>) -> Self {
        self.r#type = Some(filter);
        self
    }
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
            .values(row_from_document(doc)?)
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
            Some(row) => Some(document_from_row(row)?),
            None => None,
        })
    }

    /// Get the latest version of some documents
    pub fn query(&self, filter: Option<DocumentFilter>) -> Result<Vec<Document>, RepositoryError> {
        let mut query = latest_document::dsl::latest_document.into_boxed();
        if let Some(f) = filter {
            let DocumentFilter {
                name,
                r#type,
                owner,
                context,
            } = f;

            apply_string_filter!(query, name, latest_document::dsl::name);
            apply_equal_filter!(query, r#type, latest_document::dsl::type_);
            apply_equal_filter!(query, owner, latest_document::dsl::owner);
            apply_equal_filter!(query, context, latest_document::dsl::context);
        }
        let rows: Vec<DocumentRow> = query.load(&self.connection.connection)?;

        let mut result = Vec::<Document>::new();
        for row in rows {
            result.push(document_from_row(row)?);
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
                owner,
                context,
            } = f;

            apply_string_filter!(query, name, document::dsl::name);
            apply_equal_filter!(query, r#type, document::dsl::type_);
            apply_equal_filter!(query, owner, document::dsl::owner);
            apply_equal_filter!(query, context, document::dsl::context);
        }
        let rows: Vec<DocumentRow> = query
            .order(document::dsl::timestamp.desc())
            .load(&self.connection.connection)?;

        let mut result = Vec::<Document>::new();
        for row in rows {
            result.push(document_from_row(row)?);
        }
        Ok(result)
    }
}

fn document_from_row(row: DocumentRow) -> Result<Document, RepositoryError> {
    let parents: Vec<String> =
        serde_json::from_str(&row.parent_ids).map_err(|err| RepositoryError::DBError {
            msg: "Invalid parents data".to_string(),
            extra: format!("{}", err),
        })?;
    let data: serde_json::Value =
        serde_json::from_str(&row.data).map_err(|err| RepositoryError::DBError {
            msg: "Invalid data".to_string(),
            extra: format!("{}", err),
        })?;

    let document = Document {
        id: row.id,
        name: row.name,
        parent_ids: parents,
        user_id: row.user_id,
        timestamp: DateTime::<Utc>::from_utc(row.timestamp, Utc),
        r#type: row.r#type,
        data,
        schema_id: row.schema_id,
        status: row.status,
        comment: row.comment,
        owner: row.owner,
        context: row.context,
    };

    Ok(document)
}

fn row_from_document(doc: &Document) -> Result<DocumentRow, RepositoryError> {
    let parents =
        serde_json::to_string(&doc.parent_ids).map_err(|err| RepositoryError::DBError {
            msg: "Can't serialize parents".to_string(),
            extra: format!("{}", err),
        })?;
    let data = serde_json::to_string(&doc.data).map_err(|err| RepositoryError::DBError {
        msg: "Can't serialize data".to_string(),
        extra: format!("{}", err),
    })?;
    Ok(DocumentRow {
        id: doc.id.to_owned(),
        name: doc.name.to_owned(),
        parent_ids: parents,
        user_id: doc.user_id.to_owned(),
        timestamp: doc.timestamp.naive_utc(),
        r#type: doc.r#type.to_owned(),
        data,
        schema_id: doc.schema_id.clone(),
        status: doc.status.to_owned(),
        comment: doc.comment.to_owned(),
        owner: doc.owner.to_owned(),
        context: doc.context.to_owned(),
    })
}
