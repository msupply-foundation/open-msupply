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
        let connection_manager = self.connection_manager.clone();
        let keys = keys.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<HashMap<String, Program>, RepositoryError> {
                let connection = connection_manager.connection()?;
                let repo = ProgramRepository::new(&connection);
                let result = repo
                    .query(
                        Pagination {
                            limit: keys.len() as u32,
                            offset: 0,
                        },
                        Some(ProgramFilter::new().id(EqualFilter::equal_any(keys))),
                        None,
                    )?
                    .into_iter()
                    .map(|program| {
                        let id = program.id.clone();
                        (id, program)
                    })
                    .collect();
                Ok(result)
            },
        )
        .await
        .map_err(|e| RepositoryError::as_db_error("Loader blocking task failed", e))?
    }
}

#[derive(Clone, PartialEq, Eq, Debug, Hash)]
pub struct ProgramsByItemIdLoaderInput {
    pub store_id: String,
    pub item_id: String,
}
impl ProgramsByItemIdLoaderInput {
    pub fn new(store_id: &str, item_id: &str) -> Self {
        ProgramsByItemIdLoaderInput {
            store_id: store_id.to_string(),
            item_id: item_id.to_string(),
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
        let service_provider = self.service_provider.clone();
        let ids_with_store_id = ids_with_store_id.to_vec();

        tokio::task::spawn_blocking(
            move || -> Result<
                HashMap<ProgramsByItemIdLoaderInput, Vec<Program>>,
                async_graphql::Error,
            > {
                let service_context = service_provider.basic_context()?;
                let connection = service_context.connection;

                let mut store_item_map = HashMap::<String, Vec<String>>::new();
                for item in &ids_with_store_id {
                    let entry = store_item_map.entry(item.store_id.clone()).or_default();
                    entry.push(item.item_id.clone())
                }
                let mut output =
                    HashMap::<ProgramsByItemIdLoaderInput, Vec<Program>>::new();

                for (store_id, item_ids) in store_item_map {
                    for item_id in item_ids {
                        let program = ProgramRepository::new(&connection).query_by_filter(
                            ProgramFilter::new()
                                .exists_for_store_id(EqualFilter::equal_to(store_id.to_string()))
                                .item_id(EqualFilter::equal_to(item_id.to_string())),
                        )?;

                        let entry = output.entry(ProgramsByItemIdLoaderInput {
                            store_id: store_id.clone(),
                            item_id,
                        });

                        entry.or_default().extend(program);
                    }
                }

                Ok(output)
            },
        )
        .await
        .map_err(|e| async_graphql::Error::new(format!("Loader blocking task failed: {e}")))?
    }
}
