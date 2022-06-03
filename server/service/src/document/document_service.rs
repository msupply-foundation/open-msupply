use chrono::Utc;

use jsonschema::JSONSchema;
use repository::{
    AncestorDetail, Document, DocumentFilter, DocumentRepository, EqualFilter,
    JsonSchemaRepository, RepositoryError, StorageConnection,
};

use crate::service_provider::ServiceContext;

use super::{
    common_ancestor::{common_ancestors, AncestorDB, CommonAncestorError, InMemoryAncestorDB},
    merge::{three_way_merge, two_way_merge, TakeLatestConflictSolver},
    raw_document::RawDocument,
    topological_sort::{extract_tree, topo_sort},
    update_trigger::document_updated,
};

#[derive(Debug, PartialEq)]
pub enum DocumentInsertError {
    /// Input document doesn't match the provided json schema
    InvalidDataSchema(Vec<String>),
    /// Document version needs to be merged first. Contains an automerged document which can be
    /// reviewed and/or inserted.
    /// If no automerged document is provided the document couldn't be automerged, e.g because the
    /// merged data has an invalid data schema.
    MergeRequired(Option<RawDocument>),
    InvalidDocumentHistory,
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

pub trait DocumentServiceTrait: Sync + Send {
    fn get_document(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        name: &str,
    ) -> Result<Option<Document>, RepositoryError> {
        DocumentRepository::new(&ctx.connection).find_one_by_name(store_id, name)
    }

    fn get_documents(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        filter: Option<DocumentFilter>,
    ) -> Result<Vec<Document>, RepositoryError> {
        let filter = filter.map(|mut f| {
            f.store_id = Some(EqualFilter::equal_to(store_id));
            f
        });
        DocumentRepository::new(&ctx.connection).query(filter)
    }

    fn get_document_history(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        name: &str,
    ) -> Result<Vec<Document>, DocumentHistoryError> {
        let repo = DocumentRepository::new(&ctx.connection);
        let head = match repo.head(store_id, name)? {
            Some(head) => head,
            None => return Ok(vec![]),
        };

        let docs = repo.document_history(name)?;

        // We might have Documents from different stores in our repo; extract our tree:
        let graph = extract_tree(head.head, docs)
            .map_err(|err| DocumentHistoryError::InternalError(err))?;
        let sorted = topo_sort(graph).map_err(|err| DocumentHistoryError::InternalError(err))?;
        Ok(sorted)
    }

    fn update_document(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        doc: RawDocument,
    ) -> Result<Document, DocumentInsertError> {
        let document = ctx
            .connection
            .transaction_sync(|con| {
                let validator = json_validator(con, &doc)?;
                if let Some(validator) = &validator {
                    validate_json(&validator, &doc.data)
                        .map_err(|errors| DocumentInsertError::InvalidDataSchema(errors))?;
                }

                match insert_document(con, store_id, doc) {
                    Ok(doc) => {
                        document_updated(con, store_id, &doc)?;
                        Ok(doc)
                    }
                    Err(err) => match err {
                        DocumentInsertError::MergeRequired(ref merged_doc) => {
                            // check that the merged document has a valid schema
                            if let (Some(validator), Some(merged_doc)) = (&validator, merged_doc) {
                                validate_json(&validator, &merged_doc.data)
                                    .map_err(|_| DocumentInsertError::MergeRequired(None))?;
                            }
                            Err(err)
                        }
                        _ => Err(err),
                    },
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
        match err {
            RepositoryError::NotFound => DocumentInsertError::InvalidDocumentHistory,
            _ => DocumentInsertError::DatabaseError(err),
        }
    }
}

fn two_way_document_merge(our: RawDocument, their: Document) -> RawDocument {
    let our_data = our.data;
    let their_data = their.data;

    let solver = TakeLatestConflictSolver::new(our.timestamp.clone(), their.timestamp.clone());
    let merged = two_way_merge(&our_data, &their_data, &solver);

    let mut new_parents = our.parents;
    new_parents.push(their.id);

    RawDocument {
        parents: new_parents,
        timestamp: Utc::now(),
        data: merged,

        // keep exiting
        name: our.name,
        r#type: our.r#type,
        author: our.author,
        schema_id: our.schema_id,
    }
}

fn three_way_document_merge(our: RawDocument, their: Document, base: Document) -> RawDocument {
    let our_data = our.data;
    let their_data = their.data;
    let base_data = base.data;

    let solver = TakeLatestConflictSolver::new(our.timestamp.clone(), their.timestamp.clone());
    let merged = three_way_merge(&our_data, &their_data, &base_data, &solver);

    let mut new_parents = our.parents;
    new_parents.push(their.id);

    RawDocument {
        parents: new_parents,
        timestamp: Utc::now(),
        data: merged,

        name: our.name,
        author: our.author,
        r#type: our.r#type,
        schema_id: our.schema_id,
    }
}

fn json_validator(
    connection: &StorageConnection,
    doc: &RawDocument,
) -> Result<Option<JSONSchema>, DocumentInsertError> {
    let schema_id = match &doc.schema_id {
        Some(schema_id) => schema_id,
        None => return Ok(None),
    };

    let schema_repo = JsonSchemaRepository::new(connection);
    let schema = schema_repo.find_one_by_id(&schema_id)?;
    let compiled = match JSONSchema::compile(&schema.schema) {
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

/// Does a raw insert without schema validation
fn insert_document(
    connection: &StorageConnection,
    store_id: &str,
    doc: RawDocument,
) -> Result<Document, DocumentInsertError> {
    let repo = DocumentRepository::new(connection);
    let head_option = repo.head(store_id, &doc.name)?;
    // do a unchecked insert of the doc and update the head
    let insert_doc_and_head = |raw_doc: RawDocument| -> Result<Document, DocumentInsertError> {
        let doc = raw_doc
            .finalise()
            .map_err(|err| DocumentInsertError::InternalError(err))?;
        repo.insert_document(&doc)?;
        repo.update_document_head(store_id, &doc)?;
        Ok(doc)
    };
    let head = match head_option {
        Some(head) => {
            if doc.parents.contains(&head.head) {
                return Ok(insert_doc_and_head(doc)?);
            }
            head
        }
        None => {
            if doc.parents.is_empty() {
                return Ok(insert_doc_and_head(doc)?);
            }
            return Err(DocumentInsertError::InvalidDocumentHistory);
        }
    };

    // Leaving the happy path; propose a auto merged doc:
    // 1) if has common ancestor -> 3 way merge
    // 2) else -> 2 way merge

    // prepare some common data:
    let their_doc = repo
        .find_one_by_id(&head.head)?
        .ok_or(DocumentInsertError::InternalError(
            "Failed to load existing document".to_string(),
        ))?;
    let mut db = InMemoryAncestorDB::new();
    db.insert(&repo.ancestor_details(&doc.name)?);

    // use our latest parent to find the common ancestor
    let mut our_parents = Vec::<AncestorDetail>::new();
    for parent in &doc.parents {
        match db.get_details(parent) {
            Some(detail) => our_parents.push(detail),
            None => return Err(DocumentInsertError::InvalidDocumentHistory),
        }
    }
    our_parents.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    let latest_parent = our_parents.first();
    let latest_parent_id = match latest_parent {
        Some(p) => p.id.to_owned(),
        None => {
            // no parents try a two way merge
            let merged = two_way_document_merge(doc, their_doc);
            return Err(DocumentInsertError::MergeRequired(Some(merged)));
        }
    };
    let ancestor = match common_ancestors(&db, &latest_parent_id, &their_doc.id) {
        Ok(a) => Some(a),
        Err(err) => match err {
            CommonAncestorError::NoCommonAncestorFound => None,
            CommonAncestorError::InvalidAncestorData => {
                return Err(DocumentInsertError::InvalidDocumentHistory);
            }
        },
    };

    match ancestor {
        Some(base) => {
            let base_doc =
                repo.find_one_by_id(&base)?
                    .ok_or(DocumentInsertError::InternalError(
                        "Failed to load common ancestor document".to_string(),
                    ))?;
            let merged = three_way_document_merge(doc, their_doc, base_doc);
            Err(DocumentInsertError::MergeRequired(Some(merged)))
        }
        None => {
            // no common ancestor try a two way merge
            let merged = two_way_document_merge(doc, their_doc);
            Err(DocumentInsertError::MergeRequired(Some(merged)))
        }
    }
}

#[cfg(test)]
mod document_service_test {
    use assert_json_diff::assert_json_eq;
    use chrono::{DateTime, NaiveDateTime, Utc};
    use repository::{mock::MockDataInserts, test_db::setup_all};
    use serde_json::json;

    use crate::{document::raw_document::RawDocument, service_provider::ServiceProvider};

    use super::*;

    #[actix_rt::test]
    async fn test_insert_and_auto_resolve_conflict() {
        let (_, _, connection_manager, _) = setup_all(
            "omsupply-database-document_service",
            MockDataInserts::none(),
        )
        .await;

        let service_provider = ServiceProvider::new(connection_manager);
        let context = service_provider.context().unwrap();

        let service = DocumentService {};
        let store = "test_store";
        let template = RawDocument {
            name: "test/doc".to_string(),
            parents: vec![],
            author: "me".to_string(),
            timestamp: DateTime::<Utc>::from_utc(NaiveDateTime::from_timestamp(5000, 0), Utc),
            r#type: "test_data".to_string(),
            data: json!({}),
            schema_id: None,
        };

        let mut base_doc = template.clone();
        base_doc.data = json!({
          "value1": "base",
          "map": {},
          "conflict": "base value"
        });
        let v0 = service.update_document(&context, store, base_doc).unwrap();
        // assert document is there:
        let result = service
            .get_document(&context, store, &template.name)
            .unwrap()
            .unwrap();
        assert_eq!(result.id, v0.id);

        // concurrent edits form "their" and "our"

        let mut their_doc = template.clone();
        their_doc.parents = vec![v0.id.to_owned()];
        their_doc.timestamp =
            DateTime::<Utc>::from_utc(NaiveDateTime::from_timestamp(5100, 0), Utc);
        their_doc.data = json!({
          "value1": "their change",
          "map": {
            "entry_their": 1
          },
          "conflict": "their change"
        });
        let v1 = service.update_document(&context, store, their_doc).unwrap();
        let result = service
            .get_document(&context, store, &template.name)
            .unwrap()
            .unwrap();
        assert_eq!(result.id, v1.id);

        let mut our_doc = template.clone();
        our_doc.parents = vec![v0.id.to_owned()];
        our_doc.timestamp = DateTime::<Utc>::from_utc(NaiveDateTime::from_timestamp(5200, 0), Utc);
        our_doc.data = json!({
          "value1": "base",
          "map": {
            "entry_our": 2
          },
          "conflict": "our change wins because we are more recent"
        });
        let merge_err = service
            .update_document(&context, store, our_doc)
            .unwrap_err();
        let auto_merge = match merge_err {
            DocumentInsertError::MergeRequired(auto_merge) => auto_merge,
            err => panic!(
                "Expected DocumentInsertError::MergeRequired but got: {:?}",
                err
            ),
        }
        .unwrap();
        // try to insert the auto merge
        service
            .update_document(&context, store, auto_merge)
            .unwrap();
        let result = service
            .get_document(&context, store, &template.name)
            .unwrap()
            .unwrap();
        assert_json_eq!(
            result.data,
            json!({
              "value1": "their change",
              "map": {
                "entry_their": 1,
                "entry_our": 2
              },
              "conflict": "our change wins because we are more recent"
            })
        );
        assert_eq!(result.parent_ids, vec![v0.id.to_owned(), v1.id.to_owned()]);

        // add new doc with a merge as parent
        let mut next_doc = template.clone();
        next_doc.parents = vec![result.id.to_owned()];
        next_doc.timestamp = DateTime::<Utc>::from_utc(NaiveDateTime::from_timestamp(5500, 0), Utc);
        next_doc.data = json!({
          "value1": "next change",
          "map": {
            "entry_their": 1,
            "entry_our": 2
          },
          "conflict": "our change wins because we are more recent"
        });
        let v4 = service.update_document(&context, store, next_doc).unwrap();
        let result = service
            .get_document(&context, store, &template.name)
            .unwrap()
            .unwrap();
        assert_eq!(result.id, v4.id);
        assert_json_eq!(
            result.data,
            json!({
              "value1": "next change",
              "map": {
                "entry_their": 1,
                "entry_our": 2
              },
              "conflict": "our change wins because we are more recent"
            })
        );
    }
}
