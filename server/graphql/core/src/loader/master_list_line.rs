use async_graphql::dataloader::*;
use repository::{
    EqualFilter, MasterListLine, MasterListLineFilter, MasterListLineRepository, RepositoryError,
    StorageConnectionManager,
};
use std::collections::HashMap;
pub struct MasterListLineByMasterListId {
    pub connection_manager: StorageConnectionManager,
}

#[async_trait::async_trait]
impl Loader<String> for MasterListLineByMasterListId {
    type Value = Vec<MasterListLine>;
    type Error = RepositoryError;

    async fn load(
        &self,
        master_list_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = MasterListLineRepository::new(&connection);

        let all_master_list_lines = repo.query_by_filter(
            MasterListLineFilter::new()
                .master_list_id(EqualFilter::equal_any(master_list_ids.to_owned())),
        )?;

        // Put lines into a map grouped by master list id:
        // master_list_id -> list of master_list_line for the master_list_id
        let mut map: HashMap<String, Vec<MasterListLine>> = HashMap::new();
        for line in all_master_list_lines {
            let list = map
                .entry(line.master_list_id.clone())
                .or_insert_with(|| Vec::<MasterListLine>::new());
            list.push(line);
        }
        Ok(map)
    }
}
