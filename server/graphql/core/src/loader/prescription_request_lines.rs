use async_graphql::dataloader::*;
use repository::{
    PrescriptionRequestLineRow, PrescriptionRequestLineRowRepository, RepositoryError,
    StorageConnectionManager,
};
use std::collections::HashMap;

pub struct PrescriptionRequestLinesByRequestIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for PrescriptionRequestLinesByRequestIdLoader {
    type Value = Vec<PrescriptionRequestLineRow>;
    type Error = RepositoryError;

    async fn load(
        &self,
        prescription_request_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = PrescriptionRequestLineRowRepository::new(&connection);

        let mut map: HashMap<String, Vec<PrescriptionRequestLineRow>> = HashMap::new();
        let all_lines = repo.find_many_by_prescription_request_ids(prescription_request_ids)?;
        for line in all_lines {
            map.entry(line.prescription_request_id.clone())
                .or_default()
                .push(line);
        }
        Ok(map)
    }
}
