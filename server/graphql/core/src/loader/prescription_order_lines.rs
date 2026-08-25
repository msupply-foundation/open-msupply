use async_graphql::dataloader::*;
use repository::{
    PrescriptionOrderLineRow, PrescriptionOrderLineRowRepository, RepositoryError,
    StorageConnectionManager,
};
use std::collections::HashMap;

pub struct PrescriptionOrderLinesByOrderIdLoader {
    pub connection_manager: StorageConnectionManager,
}

impl Loader<String> for PrescriptionOrderLinesByOrderIdLoader {
    type Value = Vec<PrescriptionOrderLineRow>;
    type Error = RepositoryError;

    async fn load(
        &self,
        prescription_order_ids: &[String],
    ) -> Result<HashMap<String, Self::Value>, Self::Error> {
        let connection = self.connection_manager.connection()?;
        let repo = PrescriptionOrderLineRowRepository::new(&connection);

        let mut map: HashMap<String, Vec<PrescriptionOrderLineRow>> = HashMap::new();
        let all_lines = repo.find_many_by_prescription_order_ids(prescription_order_ids)?;
        for line in all_lines {
            map.entry(line.prescription_order_id.clone())
                .or_default()
                .push(line);
        }
        Ok(map)
    }
}
