use crate::loader::IdPair;
use actix_web::web::Data;
use async_graphql::dataloader::*;
use async_graphql::*;
use repository::{EqualFilter, Pagination, Program, ProgramFilter, ProgramRepository};
use repository::{RepositoryError, StorageConnectionManager};
use service::service_provider::ServiceProvider;
use std::collections::HashMap;

pub struct ProgramByIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for ProgramByIdLoader {
    type Value = Program;
    type Error = RepositoryError;

    async fn load(&self, keys: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = ProgramRepository::new(&connection);
        let result = repo
            .query(
                Pagination {
                    limit: keys.len() as u32,
                    offset: 0,
                },
                Some(ProgramFilter::new().id(EqualFilter::equal_any(keys.to_vec()))),
                None,
            )?
            .into_iter()
            .map(|program| {
                let id = program.id.clone();
                (id, program)
            })
            .collect();
        Ok(result)
    }
}

#[derive(Clone, Debug)]
pub struct EmptyPayload;
pub type ProgramsByItemIdLoaderInput = IdPair<EmptyPayload>;
impl ProgramsByItemIdLoaderInput {
    pub fn new(store_id: &str, item_id: &str) -> Self {
        ProgramsByItemIdLoaderInput {
            primary_id: store_id.to_string(),
            secondary_id: item_id.to_string(),
            payload: EmptyPayload {},
        }
    }
}
pub struct ProgramsByItemIdLoader {
    pub service_provider: Data<ServiceProvider>,
}

impl Loader<ProgramsByItemIdLoaderInput> for ProgramsByItemIdLoader {
    type Value = Vec<Program>;
    type Error = async_graphql::Error;

    async fn load(
        &self,
        ids_with_store_id: &[ProgramsByItemIdLoaderInput],
    ) -> Result<HashMap<ProgramsByItemIdLoaderInput, Self::Value>, Self::Error> {
        let service_context = self.service_provider.basic_context()?;
        let connection = service_context.connection;

        let mut store_item_map = HashMap::<String, Vec<String>>::new();
        for item in ids_with_store_id {
            let entry = store_item_map.entry(item.primary_id.clone()).or_default();
            entry.push(item.secondary_id.clone())
        }
        let mut output = HashMap::<ProgramsByItemIdLoaderInput, Self::Value>::new();

        for (store_id, item_ids) in store_item_map {
            for item_id in item_ids {
                let program = ProgramRepository::new(&connection).query_by_filter(
                    ProgramFilter::new()
                        .exists_for_store_id(EqualFilter::equal_to(store_id.to_string()))
                        .item_id(EqualFilter::equal_to(item_id.to_string())),
                )?;

                let entry = output.entry(ProgramsByItemIdLoaderInput {
                    primary_id: store_id.clone(),
                    secondary_id: item_id,
                    payload: EmptyPayload {},
                });

                entry.or_default().extend(program);
            }
        }

        Ok(output)
    }
}
