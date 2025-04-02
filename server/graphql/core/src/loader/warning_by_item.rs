// use repository::{EqualFilter, Warning, WarningFilter, WarningRepository};
// use repository::{RepositoryError, StorageConnectionManager};

// use async_graphql::dataloader::*;
// use async_graphql::*;
// use std::collections::HashMap;

// pub struct WarningByItemIdLoader {
//     pub connection_manager: StorageConnectionManager,
// }

// impl Loader<String> for WarningByItemIdLoader {
//     type Value = Vec<Warning>;
//     type Error = RepositoryError;

//     async fn load(&self, ids: &[String]) -> Result<HashMap<String, Self::Value>, Self::Error> {
//         let connection = self.connection_manager.connection()?;
//         let repo = WarningRepository::new(&connection);

//         let warnings = repo.query_by_filter(
//             WarningFilter::new().item_warning_link_id(EqualFilter::equal_any(ids.to_owned())),
//         )?;

//         let mut map: HashMap<String, Vec<Warning>> = HashMap::new();

//         for warning in warnings {
//             let id = warning.id.clone();
//             let list = map.entry(id).or_default();
//             list.push(warning);
//         }

//         Ok(map)
//     }
// }
