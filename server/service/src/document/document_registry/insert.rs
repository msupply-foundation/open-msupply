use repository::{
    DocumentRegistry, DocumentRegistryCategory, DocumentRegistryFilter, DocumentRegistryRepository,
    DocumentRegistryRow, DocumentRegistryRowRepository, EqualFilter, FormSchemaRowRepository,
    Pagination, RepositoryError,
};

use crate::service_provider::ServiceContext;

#[derive(PartialEq, Debug)]
pub enum InsertDocRegistryError {
    NotAllowedToMutateDocument,
    OnlyOnePatientEntryAllowed,
    DataSchemaDoesNotExist,
    /// The id or the document type belongs to an entry a form plugin
    /// installed (holds the plugin's code). Only installing the plugin again
    /// writes that entry, so an insert would wipe its event rules and owner.
    OwnedByPlugin(String),
    InternalError(String),
    RepositoryError(RepositoryError),
}

pub struct InsertDocumentRegistry {
    pub id: String,
    pub document_type: String,
    pub context_id: String,
    pub category: DocumentRegistryCategory,
    pub name: Option<String>,
    pub form_schema_id: String,
}

pub fn insert(
    ctx: &ServiceContext,
    input: InsertDocumentRegistry,
    allowed_ctx: &[String],
) -> Result<DocumentRegistry, InsertDocRegistryError> {
    let result = ctx
        .connection
        .transaction_sync(
            |connection| -> Result<DocumentRegistry, InsertDocRegistryError> {
                validate(ctx, &input, allowed_ctx)?;
                let id = input.id.clone();
                let data = generate(input);
                DocumentRegistryRowRepository::new(connection).upsert_one(&data)?;

                let result = DocumentRegistryRepository::new(connection)
                    .query(
                        Pagination::one(),
                        Some(
                            DocumentRegistryFilter::new().id(EqualFilter::equal_to(id.to_string())),
                        ),
                        None,
                    )?
                    .pop()
                    .ok_or(InsertDocRegistryError::InternalError(
                        "Just inserted document registry not found".to_string(),
                    ))?;
                Ok(result)
            },
        )
        .map_err(|error| error.to_inner_error())?;
    Ok(result)
}

fn generate(
    InsertDocumentRegistry {
        id,
        document_type,
        context_id,
        category,
        name,
        form_schema_id,
    }: InsertDocumentRegistry,
) -> DocumentRegistryRow {
    DocumentRegistryRow {
        id,
        category,
        document_type,
        context_id,
        name,
        form_schema_id: Some(form_schema_id),
        config: None,
        plugin_code: None,
        program_key: None,
    }
}

fn validate(
    ctx: &ServiceContext,
    input: &InsertDocumentRegistry,
    allowed_ctx: &[String],
) -> Result<(), InsertDocRegistryError> {
    if !allowed_ctx.contains(&input.context_id) {
        return Err(InsertDocRegistryError::NotAllowedToMutateDocument);
    }
    if let Some(plugin_code) = owning_plugin(ctx, input)? {
        return Err(InsertDocRegistryError::OwnedByPlugin(plugin_code));
    }
    if !validate_unique_patient_entry(ctx, input)? {
        return Err(InsertDocRegistryError::OnlyOnePatientEntryAllowed);
    }

    if !validate_schema_exits(ctx, input)? {
        return Err(InsertDocRegistryError::DataSchemaDoesNotExist);
    }

    Ok(())
}

/// The plugin that owns the entry with this id, or an entry for this
/// document type, if any.
fn owning_plugin(
    ctx: &ServiceContext,
    input: &InsertDocumentRegistry,
) -> Result<Option<String>, RepositoryError> {
    let repo = DocumentRegistryRowRepository::new(&ctx.connection);
    let by_id = repo.find_one_by_id(&input.id)?;
    let by_type = repo.find_many_by_document_type(&input.document_type)?;
    Ok(by_id
        .into_iter()
        .chain(by_type)
        .find_map(|row| row.plugin_code))
}

fn validate_unique_patient_entry(
    ctx: &ServiceContext,
    input: &InsertDocumentRegistry,
) -> Result<bool, RepositoryError> {
    if input.category != DocumentRegistryCategory::Patient {
        return Ok(true);
    }
    let repo = DocumentRegistryRepository::new(&ctx.connection);
    let result = repo.count(Some(
        DocumentRegistryFilter::new().r#type(DocumentRegistryCategory::Patient.equal_to()),
    ))?;
    Ok(result == 0)
}

fn validate_schema_exits(
    ctx: &ServiceContext,
    input: &InsertDocumentRegistry,
) -> Result<bool, RepositoryError> {
    let repo = FormSchemaRowRepository::new(&ctx.connection);
    let result = repo.find_one_by_id(&input.form_schema_id)?;
    Ok(result.is_some())
}

impl From<RepositoryError> for InsertDocRegistryError {
    fn from(err: RepositoryError) -> Self {
        InsertDocRegistryError::RepositoryError(err)
    }
}
