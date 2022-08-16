use std::collections::HashMap;

use repository::{
    DocumentFilter, DocumentRepository, Encounter, EncounterFilter, EncounterRepository,
    EncounterSort, PaginationOption, RepositoryError, StringFilter,
};

use crate::{
    get_default_pagination, i64_to_u32, service_provider::ServiceContext, ListError, ListResult,
};

use super::extract_fields::extract_fields;

pub struct ExtractFieldInput {
    pub fields: Vec<String>,
}

pub struct ExtractFieldResult {
    pub row: Encounter,
    pub fields: Vec<serde_json::Value>,
}

const MAX_LIMIT: u32 = 1000;
const MIN_LIMIT: u32 = 1;

pub(crate) fn encounter_extract_fields(
    ctx: &ServiceContext,
    input: ExtractFieldInput,
    pagination: Option<PaginationOption>,
    filter: Option<EncounterFilter>,
    sort: Option<EncounterSort>,
) -> Result<ListResult<ExtractFieldResult>, ListError> {
    let pagination = get_default_pagination(pagination, MAX_LIMIT, MIN_LIMIT)?;
    let repository = EncounterRepository::new(&ctx.connection);
    let encounters = repository.query(pagination, filter.clone(), sort)?;
    let doc_names = encounters
        .iter()
        .map(|row| row.name.clone())
        .collect::<Vec<_>>();
    let documents = DocumentRepository::new(&ctx.connection).query(Some(
        DocumentFilter::new().name(StringFilter::equal_any(doc_names)),
    ))?;
    let mut doc_map = documents
        .into_iter()
        .map(|d| (d.name.clone(), d))
        .collect::<HashMap<_, _>>();
    let rows = encounters
        .into_iter()
        .map(|row| {
            let doc = match doc_map.remove(&row.name) {
                Some(doc) => doc,
                // should not happen:
                None => return Err(RepositoryError::NotFound),
            };
            Ok(ExtractFieldResult {
                row,
                fields: extract_fields(&input.fields, &doc.data),
            })
        })
        .collect::<Result<Vec<ExtractFieldResult>, RepositoryError>>()?;

    Ok(ListResult {
        rows,
        count: i64_to_u32(repository.count(filter)?),
    })
}
