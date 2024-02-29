use std::collections::HashMap;

use repository::{
    DocumentFilter, DocumentRepository, Encounter, EncounterFilter, EncounterRepository,
    EncounterSort, Pagination, PaginationOption, RepositoryError, StringFilter,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

use super::extract_fields::extract_fields;

pub struct EncounterFields {
    pub fields: Vec<String>,
}

pub struct EncounterFieldsResult {
    pub row: Encounter,
    pub fields: Vec<serde_json::Value>,
}

const MAX_LIMIT: u32 = 1000;
const MIN_LIMIT: u32 = 1;

pub(crate) fn encounter_fields(
    ctx: &ServiceContext,
    input: EncounterFields,
    pagination: Option<PaginationOption>,
    filter: Option<EncounterFilter>,
    sort: Option<EncounterSort>,
    allowed_ctx: Vec<String>,
) -> Result<ListResult<EncounterFieldsResult>, ListError> {
    // restrict query results to allowed entries
    let mut filter = filter.unwrap_or(EncounterFilter::new());
    filter.program_context_id = Some(
        filter
            .program_context_id
            .unwrap_or_default()
            .restrict_results(&allowed_ctx),
    );

    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = EncounterRepository::new(&ctx.connection);
    let encounters = repository.query(pagination, Some(filter.clone()), sort)?;
    let doc_names = encounters
        .iter()
        .map(|encounter| encounter.row.document_name.clone())
        .collect::<Vec<_>>();
    let documents = DocumentRepository::new(&ctx.connection).query(
        Pagination::all(),
        Some(DocumentFilter::new().name(StringFilter::equal_any(doc_names))),
        None,
    )?;
    let mut doc_map = documents
        .into_iter()
        .map(|d| (d.name.clone(), d))
        .collect::<HashMap<_, _>>();
    let rows = encounters
        .into_iter()
        .map(|encounter| {
            let doc = match doc_map.remove(&encounter.row.document_name) {
                Some(doc) => doc,
                // should not happen:
                None => return Err(RepositoryError::NotFound),
            };
            Ok(EncounterFieldsResult {
                row: encounter,
                fields: extract_fields(&input.fields, &doc.data),
            })
        })
        .collect::<Result<Vec<EncounterFieldsResult>, RepositoryError>>()?;

    Ok(ListResult {
        rows,
        count: i64_to_u32(repository.count(Some(filter))?),
    })
}
