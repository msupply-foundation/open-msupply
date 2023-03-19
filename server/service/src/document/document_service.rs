use chrono::Utc;
use jsonschema::JSONSchema;
use repository::{
    Document, DocumentFilter, DocumentRepository, DocumentSort, DocumentStatus, EqualFilter,
    FormSchemaRowRepository, Pagination, PaginationOption, RepositoryError, StorageConnection,
    StringFilter,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

use super::raw_document::RawDocument;

pub const MAX_LIMIT: u32 = 1000;
pub const MIN_LIMIT: u32 = 1;

#[derive(Debug, PartialEq)]
pub enum DocumentInsertError {
    NotAllowedToMutateDocument,
    InvalidParent(String),
    /// Input document doesn't match the provided json schema
    InvalidDataSchema(Vec<String>),
    DataSchemaDoesNotExist,
    DatabaseError(RepositoryError),
    InternalError(String),
}

#[derive(Debug)]
pub enum DocumentHistoryError {
    DatabaseError(RepositoryError),
    InternalError(String),
}

impl From<RepositoryError> for DocumentHistoryError {
    fn from(err: RepositoryError) -> Self {
        DocumentHistoryError::DatabaseError(err)
    }
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct DocumentDelete {
    pub id: String,
}

#[derive(Debug, PartialEq)]
pub enum DocumentDeleteError {
    NotAllowedToMutateDocument,
    DocumentNotFound,
    DocumentHasAlreadyBeenDeleted,
    DatabaseError(RepositoryError),
    InternalError(String),
}

impl From<RepositoryError> for DocumentDeleteError {
    fn from(err: RepositoryError) -> Self {
        DocumentDeleteError::DatabaseError(err)
    }
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct DocumentUndelete {
    pub id: String,
}

#[derive(Debug, PartialEq)]
pub enum DocumentUndeleteError {
    NotAllowedToMutateDocument,
    DocumentNotFound,
    ParentDoesNotExist,
    CannotUndeleteActiveDocument,
    DatabaseError(RepositoryError),
    InternalError(String),
}

impl From<RepositoryError> for DocumentUndeleteError {
    fn from(err: RepositoryError) -> Self {
        DocumentUndeleteError::DatabaseError(err)
    }
}

pub trait DocumentServiceTrait: Sync + Send {
    fn document(
        &self,
        ctx: &ServiceContext,
        name: &str,
        allowed_docs: Option<&[String]>,
    ) -> Result<Option<Document>, RepositoryError> {
        let mut filter = DocumentFilter::new().name(StringFilter::equal_to(name));
        if let Some(allowed_docs) = allowed_docs {
            filter = filter.r#type(EqualFilter::default().restrict_results(allowed_docs));
        }
        Ok(DocumentRepository::new(&ctx.connection)
            .query(Pagination::one(), Some(filter), None)?
            .pop())
    }

    fn documents(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<DocumentFilter>,
        sort: Option<DocumentSort>,
        allowed_docs: Option<&[String]>,
    ) -> Result<ListResult<Document>, ListError> {
        let mut filter = filter.unwrap_or(DocumentFilter::new());
        if let Some(allowed_docs) = allowed_docs {
            filter.r#type = Some(
                filter
                    .r#type
                    .unwrap_or_default()
                    .restrict_results(allowed_docs),
            );
        }
        let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
        let repository = DocumentRepository::new(&ctx.connection);
        Ok(ListResult {
            rows: repository.query(pagination, Some(filter.clone()), sort)?,
            count: i64_to_u32(repository.count(Some(filter))?),
        })
    }

    fn document_history(
        &self,
        ctx: &ServiceContext,
        name: &str,
        allowed_docs: &[String],
    ) -> Result<Vec<Document>, DocumentHistoryError> {
        let filter = DocumentFilter::new()
            .name(StringFilter::equal_to(name))
            .r#type(EqualFilter::default().restrict_results(allowed_docs));

        let repo = DocumentRepository::new(&ctx.connection);
        let docs = repo.document_history(Some(filter))?;
        Ok(docs)
    }

    fn update_document(
        &self,
        ctx: &ServiceContext,
        doc: RawDocument,
        allowed_docs: &[String],
    ) -> Result<Document, DocumentInsertError> {
        let document = ctx
            .connection
            .transaction_sync(|con| {
                if !allowed_docs.contains(&doc.r#type) {
                    return Err(DocumentInsertError::NotAllowedToMutateDocument);
                }
                let validator = json_validator(con, &doc)?;
                if let Some(validator) = &validator {
                    validate_json(&validator, &doc.data)
                        .map_err(|errors| DocumentInsertError::InvalidDataSchema(errors))?;
                }
                if let Some(invalid_parent) = validate_parents(con, &doc)? {
                    return Err(DocumentInsertError::InvalidParent(invalid_parent));
                }

                insert_document(con, doc)
            })
            .map_err(|err| err.to_inner_error())?;
        Ok(document)
    }

    fn delete_document(
        &self,
        ctx: &ServiceContext,
        user_id: &str,
        input: DocumentDelete,
        allowed_docs: &[String],
    ) -> Result<(), DocumentDeleteError> {
        ctx.connection
            .transaction_sync(|con| {
                let current_document = validate_document_delete(con, &input.id, allowed_docs)?;
                let document = generate_deleted_document(current_document, user_id)?;

                match DocumentRepository::new(con).insert(&document) {
                    Ok(_) => Ok(()),
                    Err(error) => Err(DocumentDeleteError::DatabaseError(error)),
                }
            })
            .map_err(|err| err.to_inner_error())?;
        Ok(())
    }

    fn undelete_document(
        &self,
        ctx: &ServiceContext,
        user_id: &str,
        input: DocumentUndelete,
        allowed_docs: &[String],
    ) -> Result<Document, DocumentUndeleteError> {
        let document = ctx
            .connection
            .transaction_sync(|con| {
                let parent_doc = validate_document_undelete(con, &input.id, allowed_docs)?;
                let document = generate_undeleted_document(&input.id, parent_doc, user_id)?;

                match DocumentRepository::new(con).insert(&document) {
                    Ok(_) => Ok(document),
                    Err(error) => Err(DocumentUndeleteError::DatabaseError(error)),
                }
            })
            .map_err(|err| err.to_inner_error())?;
        Ok(document)
    }
}

pub struct DocumentService {}
impl DocumentServiceTrait for DocumentService {}

impl From<RepositoryError> for DocumentInsertError {
    fn from(err: RepositoryError) -> Self {
        DocumentInsertError::DatabaseError(err)
    }
}

fn json_validator(
    connection: &StorageConnection,
    doc: &RawDocument,
) -> Result<Option<JSONSchema>, DocumentInsertError> {
    let form_schema_id = match &doc.form_schema_id {
        Some(schema_id) => schema_id,
        None => return Ok(None),
    };

    let schema_repo = FormSchemaRowRepository::new(connection);
    let schema = schema_repo
        .find_one_by_id(&form_schema_id)?
        .ok_or(DocumentInsertError::DataSchemaDoesNotExist)?;
    let compiled = match JSONSchema::compile(&schema.json_schema) {
        Ok(v) => Ok(v),
        Err(err) => Err(DocumentInsertError::InternalError(format!(
            "Invalid json schema: {}",
            err
        ))),
    }?;
    Ok(Some(compiled))
}

fn validate_json(validator: &JSONSchema, data: &serde_json::Value) -> Result<(), Vec<String>> {
    validator.validate(data).map_err(|errors| {
        let errors: Vec<String> = errors.map(|err| format!("{}", err)).collect();
        errors
    })
}

// Returns Some invalid parent or None
fn validate_parents(
    connection: &StorageConnection,
    doc: &RawDocument,
) -> Result<Option<String>, RepositoryError> {
    let repo = DocumentRepository::new(connection);
    for parent in &doc.parents {
        if repo.find_one_by_id(&parent)?.is_none() {
            return Ok(Some(parent.clone()));
        }
    }
    Ok(None)
}

fn validate_document_delete(
    connection: &StorageConnection,
    id: &str,
    allowed_docs: &[String],
) -> Result<Document, DocumentDeleteError> {
    let doc = match DocumentRepository::new(connection).find_one_by_id(id)? {
        Some(doc) => {
            if doc.status == DocumentStatus::Active {
                doc
            } else {
                return Err(DocumentDeleteError::DocumentHasAlreadyBeenDeleted);
            }
        }
        None => {
            return Err(DocumentDeleteError::DocumentNotFound);
        }
    };
    if !allowed_docs.contains(&doc.r#type) {
        return Err(DocumentDeleteError::NotAllowedToMutateDocument);
    }
    Ok(doc)
}

fn validate_document_undelete(
    connection: &StorageConnection,
    id: &str,
    allowed_docs: &[String],
) -> Result<Document, DocumentUndeleteError> {
    let doc = match DocumentRepository::new(connection).find_one_by_id(id)? {
        Some(doc) => {
            if doc.status == DocumentStatus::Deleted {
                doc
            } else {
                return Err(DocumentUndeleteError::CannotUndeleteActiveDocument);
            }
        }
        None => {
            return Err(DocumentUndeleteError::DocumentNotFound);
        }
    };
    if !allowed_docs.contains(&doc.r#type) {
        return Err(DocumentUndeleteError::NotAllowedToMutateDocument);
    }

    let parent = match doc.parent_ids.last() {
        Some(parent) => parent,
        None => "",
    };

    let deleted_document_parent =
        match DocumentRepository::new(connection).find_one_by_id(&parent.clone()) {
            Ok(Some(doc)) => doc,
            Ok(None) => return Err(DocumentUndeleteError::ParentDoesNotExist),
            Err(err) => return Err(DocumentUndeleteError::DatabaseError(err)),
        };

    Ok(deleted_document_parent)
}

fn generate_deleted_document(
    current_document: Document,
    user_id: &str,
) -> Result<Document, DocumentDeleteError> {
    let doc = RawDocument {
        name: current_document.name,
        parents: vec![current_document.id.clone()],
        author: user_id.to_string(),
        datetime: Utc::now(),
        r#type: current_document.r#type,
        data: serde_json::Value::Null,
        form_schema_id: current_document.form_schema_id,
        status: DocumentStatus::Deleted,
        owner_name_id: None,
        context: None,
    }
    .finalise()
    .map_err(|err| DocumentDeleteError::InternalError(err))?;

    Ok(doc)
}

fn generate_undeleted_document(
    id: &str,
    deleted_document_parent: Document,
    user_id: &str,
) -> Result<Document, DocumentUndeleteError> {
    let undeleted_doc = RawDocument {
        name: deleted_document_parent.name,
        parents: vec![id.to_string()],
        author: user_id.to_string(),
        datetime: Utc::now(),
        r#type: deleted_document_parent.r#type,
        data: deleted_document_parent.data,
        form_schema_id: deleted_document_parent.form_schema_id,
        status: DocumentStatus::Active,
        owner_name_id: deleted_document_parent.owner_name_id,
        context: deleted_document_parent.context,
    }
    .finalise()
    .map_err(|err| DocumentUndeleteError::InternalError(err))?;

    Ok(undeleted_doc)
}

/// Does a raw insert without schema validation
fn insert_document(
    connection: &StorageConnection,
    doc: RawDocument,
) -> Result<Document, DocumentInsertError> {
    let doc = doc
        .finalise()
        .map_err(|err| DocumentInsertError::InternalError(err))?;
    let repo = DocumentRepository::new(connection);
    repo.insert(&doc)?;
    Ok(doc)
}

#[cfg(test)]
mod document_service_test {
    use chrono::{DateTime, NaiveDateTime, Utc};
    use repository::{
        mock::{document_a, mock_form_schema_empty, mock_form_schema_simple, MockDataInserts},
        test_db::setup_all,
        DocumentStatus,
    };
    use serde_json::json;

    use crate::{document::raw_document::RawDocument, service_provider::ServiceProvider};

    use super::*;

    #[actix_rt::test]
    async fn test_document_updates() {
        let (_, _, connection_manager, _) = setup_all(
            "test_document_updates",
            MockDataInserts::none().form_schemas(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "");
        let context = service_provider.basic_context().unwrap();
        let service = service_provider.document_service;

        let doc_name = "test/doc2";

        // NotAllowedToMutateDocument
        let result = service.update_document(
            &context,
            RawDocument {
                name: doc_name.to_string(),
                parents: vec![],
                author: "me".to_string(),
                datetime: DateTime::<Utc>::from_utc(
                    NaiveDateTime::from_timestamp_opt(5000, 0).unwrap(),
                    Utc,
                ),
                r#type: "test_data".to_string(),
                data: json!({
                  "version": 1,
                }),
                form_schema_id: None,
                status: DocumentStatus::Active,
                owner_name_id: None,
                context: None,
            },
            &vec!["Wrong type".to_string()],
        );
        assert!(matches!(
            result,
            Err(DocumentInsertError::NotAllowedToMutateDocument)
        ));

        // successfully insert a document
        let v1 = service
            .update_document(
                &context,
                RawDocument {
                    name: doc_name.to_string(),
                    parents: vec![],
                    author: "me".to_string(),
                    datetime: DateTime::<Utc>::from_utc(
                        NaiveDateTime::from_timestamp_opt(5000, 0).unwrap(),
                        Utc,
                    ),
                    r#type: "test_data".to_string(),
                    data: json!({
                      "version": 1,
                    }),
                    form_schema_id: None,
                    status: DocumentStatus::Active,
                    owner_name_id: None,
                    context: None,
                },
                &vec!["test_data".to_string()],
            )
            .unwrap();
        let found = service.document(&context, doc_name, None).unwrap().unwrap();
        assert_eq!(found, v1);

        // invalid parents
        let result = service.update_document(
            &context,
            RawDocument {
                name: doc_name.to_string(),
                parents: vec!["invalid".to_string()],
                author: "me".to_string(),
                datetime: DateTime::<Utc>::from_utc(
                    NaiveDateTime::from_timestamp_opt(6000, 0).unwrap(),
                    Utc,
                ),
                r#type: "test_data".to_string(),
                data: json!({
                  "version": 2,
                }),
                form_schema_id: None,
                status: DocumentStatus::Active,
                owner_name_id: None,
                context: None,
            },
            &vec!["test_data".to_string()],
        );
        assert!(matches!(result, Err(DocumentInsertError::InvalidParent(_))));

        // successfully update a document
        let v2 = service
            .update_document(
                &context,
                RawDocument {
                    name: doc_name.to_string(),
                    parents: vec![v1.id.clone()],
                    author: "me".to_string(),
                    datetime: DateTime::<Utc>::from_utc(
                        NaiveDateTime::from_timestamp_opt(6000, 0).unwrap(),
                        Utc,
                    ),
                    r#type: "test_data".to_string(),
                    data: json!({
                      "version": 2,
                    }),
                    form_schema_id: None,
                    status: DocumentStatus::Active,
                    owner_name_id: None,
                    context: None,
                },
                &vec!["test_data".to_string()],
            )
            .unwrap();
        assert_eq!(v2.parent_ids[0], v1.id);
        let found = service.document(&context, doc_name, None).unwrap().unwrap();
        assert_eq!(found, v2);
        assert_eq!(found.data["version"], 2);

        // add some noise
        service
            .update_document(
                &context,
                RawDocument {
                    name: "test/noise".to_string(),
                    parents: vec![],
                    author: "me".to_string(),
                    datetime: DateTime::<Utc>::from_utc(
                        NaiveDateTime::from_timestamp_opt(8000, 0).unwrap(),
                        Utc,
                    ),
                    r#type: "test_data2".to_string(),
                    data: json!({
                      "version": 1,
                    }),
                    form_schema_id: None,
                    status: DocumentStatus::Active,
                    owner_name_id: None,
                    context: None,
                },
                &vec!["test_data2".to_string()],
            )
            .unwrap();
        // should still find the correct document
        let found = service.document(&context, doc_name, None).unwrap().unwrap();
        assert_eq!(found.id, v2.id);
    }

    #[actix_rt::test]
    async fn test_document_schema_validation() {
        let (_, _, connection_manager, _) = setup_all(
            "document_schema_validation",
            MockDataInserts::none().form_schemas(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager, "");
        let context = service_provider.basic_context().unwrap();

        let service = service_provider.document_service;

        // empty schema accepts all data
        let schema = mock_form_schema_empty();
        service
            .update_document(
                &context,
                RawDocument {
                    name: "test/doc1".to_string(),
                    parents: vec![],
                    author: "me".to_string(),
                    datetime: DateTime::<Utc>::from_utc(
                        NaiveDateTime::from_timestamp_opt(5000, 0).unwrap(),
                        Utc,
                    ),
                    r#type: "test_data".to_string(),
                    data: json!({
                      "value1": "base",
                      "map": {},
                    }),
                    form_schema_id: Some(schema.id),
                    status: DocumentStatus::Active,
                    owner_name_id: None,
                    context: None,
                },
                &vec!["test_data".to_string()],
            )
            .unwrap();

        // fails with invalid schema
        let schema = mock_form_schema_simple();
        let result = service.update_document(
            &context,
            RawDocument {
                name: "test/doc2".to_string(),
                parents: vec![],
                author: "me".to_string(),
                datetime: DateTime::<Utc>::from_utc(
                    NaiveDateTime::from_timestamp_opt(5000, 0).unwrap(),
                    Utc,
                ),
                r#type: "test_data".to_string(),
                data: json!({
                  "value1": "base",
                  "map": {},
                }),
                form_schema_id: Some(schema.id),
                status: DocumentStatus::Active,
                owner_name_id: None,
                context: None,
            },
            &vec!["test_data".to_string()],
        );
        assert!(matches!(
            result,
            Err(DocumentInsertError::InvalidDataSchema(_))
        ));

        // fails with schema type mismatch
        let schema = mock_form_schema_simple();
        let result = service.update_document(
            &context,
            RawDocument {
                name: "test/doc3".to_string(),
                parents: vec![],
                author: "me".to_string(),
                datetime: DateTime::<Utc>::from_utc(
                    NaiveDateTime::from_timestamp_opt(5000, 0).unwrap(),
                    Utc,
                ),
                r#type: "test_data".to_string(),
                data: json!({
                  "intValue": "base",
                  "strValue": 9,
                }),
                form_schema_id: Some(schema.id),
                status: DocumentStatus::Active,
                owner_name_id: None,
                context: None,
            },
            &vec!["test_data".to_string()],
        );
        assert!(matches!(
            result,
            Err(DocumentInsertError::InvalidDataSchema(_))
        ));

        // succeeds with valid schema
        let schema = mock_form_schema_simple();
        service
            .update_document(
                &context,
                RawDocument {
                    name: "test/doc4".to_string(),
                    parents: vec![],
                    author: "me".to_string(),
                    datetime: DateTime::<Utc>::from_utc(
                        NaiveDateTime::from_timestamp_opt(5000, 0).unwrap(),
                        Utc,
                    ),
                    r#type: "test_data".to_string(),
                    data: json!({
                      "intValue": 3,
                      "strValue": "str",
                    }),
                    form_schema_id: Some(schema.id),
                    status: DocumentStatus::Active,
                    owner_name_id: None,
                    context: None,
                },
                &vec!["test_data".to_string()],
            )
            .unwrap();
    }

    #[actix_rt::test]
    async fn test_document_deletion() {
        let (_, _, connection_manager, _) =
            setup_all("document_deletion", MockDataInserts::all()).await;

        let service_provider = ServiceProvider::new(connection_manager, "");
        let context = service_provider.basic_context().unwrap();

        let service = service_provider.document_service;

        // Delete document NotFound
        let invalid_doc_deletion = service.delete_document(
            &context,
            "",
            DocumentDelete {
                id: "invalid".to_string(),
            },
            &vec!["SomeType".to_string()],
        );
        assert_eq!(
            invalid_doc_deletion,
            Err(DocumentDeleteError::DocumentNotFound)
        );

        // NotAllowedToMutateDocument
        let err = service
            .delete_document(
                &context,
                "",
                DocumentDelete {
                    id: document_a().id,
                },
                &vec!["WrongType".to_string()],
            )
            .unwrap_err();
        assert_eq!(err, DocumentDeleteError::NotAllowedToMutateDocument);

        // Delete document
        service
            .delete_document(
                &context,
                "",
                DocumentDelete {
                    id: document_a().id,
                },
                &vec![document_a().r#type],
            )
            .unwrap();
        let document = service
            .document(&context, &document_a().name, None)
            .unwrap()
            .unwrap();
        assert_eq!(document.status, DocumentStatus::Deleted);
        assert_eq!(document.data, serde_json::Value::Null);

        // Delete deleted document
        let deleted_doc = service.delete_document(
            &context,
            "",
            DocumentDelete {
                id: document.id.clone(),
            },
            &vec![document.r#type.clone()],
        );
        assert_eq!(
            deleted_doc,
            Err(DocumentDeleteError::DocumentHasAlreadyBeenDeleted)
        );

        // NotAllowedToMutateDocument
        let err = service
            .undelete_document(
                &context,
                "",
                DocumentUndelete {
                    id: document.id.clone(),
                },
                &vec!["WrongType".to_string()],
            )
            .unwrap_err();
        assert_eq!(err, DocumentUndeleteError::NotAllowedToMutateDocument);

        // Undelete document
        service
            .undelete_document(
                &context,
                "",
                DocumentUndelete { id: document.id },
                &vec![document.r#type.clone()],
            )
            .unwrap();
        let undeleted_document = service
            .document(&context, &document_a().name, None)
            .unwrap()
            .unwrap();
        assert_eq!(undeleted_document.status, DocumentStatus::Active);
        assert_eq!(undeleted_document.data, document_a().data);

        // Undelete an active document
        let undelete_active_document = service.undelete_document(
            &context,
            "",
            DocumentUndelete {
                id: undeleted_document.id,
            },
            &vec![document.r#type.clone()],
        );
        assert_eq!(
            undelete_active_document,
            Err(DocumentUndeleteError::CannotUndeleteActiveDocument)
        );
    }
}
