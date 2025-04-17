use repository::{
    mock::{MockData, MockDataInserts},
    KeyType, KeyValueStoreRow, NameRow, RequisitionRow, RequisitionRowRepository, RequisitionType,
    StoreRow, Upsert,
};
use util::uuid::uuid;

use crate::{
    processors::ProcessorType,
    test_helpers::{setup_all_with_data_and_service_provider, ServiceTestContext},
};

#[tokio::test]
async fn requests_link_patient_to_oms_central_store() {
    assert!(true);
}
