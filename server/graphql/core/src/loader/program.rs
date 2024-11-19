use repository::{EqualFilter, Pagination, Program, ProgramFilter, ProgramRepository};
use repository::{RepositoryError, StorageConnectionManager};

use async_graphql::dataloader::*;
use async_graphql::*;
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
