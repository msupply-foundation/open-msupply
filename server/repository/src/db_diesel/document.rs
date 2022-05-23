use super::StorageConnection;

use crate::{db_diesel::json_schema::json_schema, diesel_macros::apply_equal_filter};
use crate::{EqualFilter, RepositoryError};

use chrono::{DateTime, NaiveDateTime, Utc};
use diesel::prelude::*;

table! {
    document (id) {
        id -> Text,
        name -> Text,
        parents -> Text,
        author -> Text,
        timestamp -> Timestamp,
        #[sql_name = "type"] type_ -> Text,
        data -> Text,
        schema_id -> Nullable<Text>,
    }
}

joinable!(document -> json_schema (schema_id));

allow_tables_to_appear_in_same_query!(document, json_schema);

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[table_name = "document"]
pub struct DocumentRow {
    /// The document data hash
    pub id: String,
    /// Document path and name
    pub name: String,
    /// Stringified array of parents
    pub parents: String,
    /// Id of the author who edited this document version
    pub author: String,
    /// The timestamp of this document version
    pub timestamp: NaiveDateTime,
    /// Type of the containing data
    #[column_name = "type_"]
    pub r#type: String,
    /// The actual document data
    pub data: String,
    /// JSON schema id containing the schema for the data
    pub schema_id: Option<String>,
}

table! {
    document_head (id) {
        id -> Text,
        store_id -> Text,
        name -> Text,
        head -> Text,
    }
}

/// Hold the a reference to the latest document version
#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[table_name = "document_head"]
pub struct DocumentHeadRow {
    /// Row id in the format "{name}@{store}"
    pub id: String,
    /// The store this head refers too. This mean we can keep track of heads from multiple stores
    /// and merge them when needed.
    pub store_id: String,
    /// The document name
    pub name: String,
    /// The current document version (hash)
    pub head: String,
}

#[derive(Debug)]
pub struct Document {
    /// The document data hash
    pub id: String,
    /// Document path and name
    pub name: String,
    /// Document parents
    pub parents: Vec<String>,
    /// Id of the author who edited this document version
    pub author: String,
    /// The timestamp of this document version
    pub timestamp: DateTime<Utc>,
    /// Type of the containing data
    pub r#type: String,
    /// The actual document data
    pub data: serde_json::Value,
    pub schema_id: Option<String>,
}

#[derive(Clone)]
pub struct AncestorDetail {
    pub id: String,
    pub parents: Vec<String>,
    pub timestamp: NaiveDateTime,
}

#[derive(Clone)]
pub struct DocumentFilter {
    pub store_id: Option<EqualFilter<String>>,
    pub name: Option<EqualFilter<String>>,
}

#[derive(Clone)]
pub struct DocumentHeadFilter {
    pub store_id: Option<EqualFilter<String>>,
    pub name: Option<EqualFilter<String>>,
}

pub struct DocumentRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DocumentRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DocumentRepository { connection }
    }

    /// Inserts a document
    pub fn insert_document(&self, doc: &Document) -> Result<(), RepositoryError> {
        diesel::insert_into(document::dsl::document)
            .values(row_from_document(doc)?)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(feature = "postgres")]
    pub fn update_document_head(&self, store_id: &str, doc: &Document) -> Result<(), RepositoryError> {
        let row = DocumentHeadRow {
            id: make_head_id(&doc.name, store),
            store_id: store_id.to_owned(),
            name: doc.name.to_owned(),
            head: doc.id.to_owned(),
        };
        diesel::insert_into(document_head_dsl::document_head)
            .values(&row)
            .on_conflict(document_head_dsl::id)
            .do_update()
            .set(&row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    /// Set document head to the provided version
    #[cfg(not(feature = "postgres"))]
    pub fn update_document_head(
        &self,
        store_id: &str,
        doc: &Document,
    ) -> Result<(), RepositoryError> {
        diesel::replace_into(document_head::dsl::document_head)
            .values(DocumentHeadRow {
                id: make_head_id(store_id, &doc.name),
                store_id: store_id.to_owned(),
                name: doc.name.to_owned(),
                head: doc.id.to_owned(),
            })
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

    /// Get the latest version of a document
    pub fn find_one_by_name(
        &self,
        store_id: &str,
        document_name: &str,
    ) -> Result<Option<Document>, RepositoryError> {
        let head = match self.head(store_id, document_name)? {
            Some(head) => head,
            None => return Ok(None),
        };
        self.find_one_by_id(&head.head)
    }

    pub fn query(&self, filter: Option<DocumentFilter>) -> Result<Vec<Document>, RepositoryError> {
        let heads_filter = filter.map(|f| DocumentHeadFilter {
            name: f.name,
            store_id: f.store_id,
        });
        let heads = self.query_heads(heads_filter)?;
        let document_ids: Vec<String> = heads.into_iter().map(|head| head.head).collect();
        let rows: Vec<DocumentRow> = document::dsl::document
            .filter(document::dsl::id.eq_any(&document_ids))
            .load(&self.connection.connection)?;

        let mut result = Vec::<Document>::new();
        for row in rows {
            result.push(document_from_row(row)?);
        }
        Ok(result)
    }

    /// Gets all document versions
    pub fn document_history(&self, document_name: &str) -> Result<Vec<Document>, RepositoryError> {
        let rows: Vec<DocumentRow> = document::dsl::document
            .filter(document::dsl::name.eq(document_name))
            .load(&self.connection.connection)?;
        let mut result = Vec::<Document>::new();
        for row in rows {
            result.push(document_from_row(row)?);
        }
        Ok(result)
    }

    pub fn head(
        &self,
        store_id: &str,
        document_name: &str,
    ) -> Result<Option<DocumentHeadRow>, RepositoryError> {
        let result: Option<DocumentHeadRow> = document_head::dsl::document_head
            .filter(document_head::dsl::id.eq(make_head_id(store_id, document_name)))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn query_heads(
        &self,
        filter: Option<DocumentHeadFilter>,
    ) -> Result<Vec<DocumentHeadRow>, RepositoryError> {
        let mut query = document_head::dsl::document_head.into_boxed();
        if let Some(f) = filter {
            apply_equal_filter!(query, f.name, document_head::dsl::name);
            apply_equal_filter!(query, f.store_id, document_head::dsl::store_id);
        }
        let result = query.load(&self.connection.connection)?;
        Ok(result)
    }

    /// Gets ancestor details for the full document history.
    pub fn ancestor_details(
        &self,
        document_name: &str,
    ) -> Result<Vec<AncestorDetail>, RepositoryError> {
        let rows: Vec<(String, String, NaiveDateTime)> = document::dsl::document
            .filter(document::dsl::name.eq(document_name))
            .select((
                document::dsl::id,
                document::dsl::parents,
                document::dsl::timestamp,
            ))
            .load(&self.connection.connection)?;
        let mut ancestors = Vec::<AncestorDetail>::new();
        for row in rows {
            let parents: Vec<String> =
                serde_json::from_str(&row.1).map_err(|err| RepositoryError::DBError {
                    msg: "Invalid parents data".to_string(),
                    extra: format!("{}", err),
                })?;
            ancestors.push(AncestorDetail {
                id: row.0,
                parents,
                timestamp: row.2,
            })
        }
        Ok(ancestors)
    }
}

fn document_from_row(row: DocumentRow) -> Result<Document, RepositoryError> {
    let parents: Vec<String> =
        serde_json::from_str(&row.parents).map_err(|err| RepositoryError::DBError {
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
        parents,
        author: row.author,
        timestamp: DateTime::<Utc>::from_utc(row.timestamp, Utc),
        r#type: row.r#type,
        data,
        schema_id: row.schema_id,
    };

    Ok(document)
}

fn row_from_document(doc: &Document) -> Result<DocumentRow, RepositoryError> {
    let parents = serde_json::to_string(&doc.parents).map_err(|err| RepositoryError::DBError {
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
        parents,
        author: doc.author.to_owned(),
        timestamp: doc.timestamp.naive_utc(),
        r#type: doc.r#type.to_owned(),
        data,
        schema_id: doc.schema_id.clone(),
    })
}

fn make_head_id(store_id: &str, name: &str) -> String {
    format!("{}@{}", name, store_id)
}
