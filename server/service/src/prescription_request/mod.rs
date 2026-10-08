use self::batch::{
    BatchPrescriptionRequest, BatchPrescriptionRequestResult, batch_prescription_request,
};
use self::delete::{DeletePrescriptionRequestError, delete_prescription_request};
use self::insert::{
    InsertPrescriptionRequest, InsertPrescriptionRequestError, insert_prescription_request,
};
use self::query::{get_prescription_request, get_prescription_requests};
use self::update::{
    UpdatePrescriptionRequest, UpdatePrescriptionRequestError, update_prescription_request,
};
use crate::{ListError, ListResult, service_provider::ServiceContext};
use repository::{
    PaginationOption, PrescriptionRequest, PrescriptionRequestFilter, PrescriptionRequestSort,
    RepositoryError,
};

pub mod batch;
pub mod delete;
pub mod generate;
pub mod insert;
pub mod query;
pub mod update;
pub mod validate;

pub trait PrescriptionRequestServiceTrait: Sync + Send {
    fn get_prescription_requests(
        &self,
        ctx: &ServiceContext,
        store_id: Option<&str>,
        pagination: Option<PaginationOption>,
        filter: Option<PrescriptionRequestFilter>,
        sort: Option<PrescriptionRequestSort>,
    ) -> Result<ListResult<PrescriptionRequest>, ListError> {
        get_prescription_requests(ctx, store_id, pagination, filter, sort)
    }

    fn get_prescription_request(
        &self,
        ctx: &ServiceContext,
        store_id: Option<&str>,
        id: &str,
    ) -> Result<Option<PrescriptionRequest>, RepositoryError> {
        get_prescription_request(ctx, store_id, id)
    }

    fn insert_prescription_request(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: InsertPrescriptionRequest,
    ) -> Result<PrescriptionRequest, InsertPrescriptionRequestError> {
        insert_prescription_request(ctx, store_id, input)
    }

    fn update_prescription_request(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpdatePrescriptionRequest,
    ) -> Result<PrescriptionRequest, UpdatePrescriptionRequestError> {
        update_prescription_request(ctx, store_id, input)
    }

    fn delete_prescription_request(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        id: String,
    ) -> Result<String, DeletePrescriptionRequestError> {
        delete_prescription_request(ctx, store_id, id)
    }

    fn batch_prescription_request(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: BatchPrescriptionRequest,
    ) -> Result<BatchPrescriptionRequestResult, RepositoryError> {
        batch_prescription_request(ctx, store_id, input)
    }
}

pub struct PrescriptionRequestService;
impl PrescriptionRequestServiceTrait for PrescriptionRequestService {}
