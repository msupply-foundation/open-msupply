use crate::service_provider::ServiceContext;
use repository::PrescriptionRequestLineRow;

pub mod delete;
pub mod upsert;

use self::delete::{delete_prescription_request_line, DeletePrescriptionRequestLineError};
use self::upsert::{
    upsert_prescription_request_line, UpsertPrescriptionRequestLine,
    UpsertPrescriptionRequestLineError,
};

// No filtered read here: lines are only ever read through their parent request,
// which GraphQL resolves with PrescriptionRequestLinesByRequestIdLoader — and
// that parent has already been store-scoped by the query that produced it.
pub trait PrescriptionRequestLineServiceTrait: Sync + Send {
    fn upsert_prescription_request_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpsertPrescriptionRequestLine,
    ) -> Result<PrescriptionRequestLineRow, UpsertPrescriptionRequestLineError> {
        upsert_prescription_request_line(ctx, store_id, input)
    }

    fn delete_prescription_request_line(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        id: String,
    ) -> Result<String, DeletePrescriptionRequestLineError> {
        delete_prescription_request_line(ctx, store_id, id)
    }
}

pub struct PrescriptionRequestLineService;
impl PrescriptionRequestLineServiceTrait for PrescriptionRequestLineService {}
