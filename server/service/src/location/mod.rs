use self::{
    delete::{delete_location, DeleteLocation, DeleteLocationError},
    insert::{insert_location, InsertLocation, InsertLocationError},
    query::{get_location, get_locations},
    update::{update_location, UpdateLocation, UpdateLocationError},
};

use super::{ListError, ListResult};
use crate::{service_provider::ServiceContext, SingleRecordError};
use repository::PaginationOption;
use repository::{Location, LocationFilter, LocationSort};

pub mod delete;
pub mod insert;
pub mod query;
pub mod update;
mod validate;

pub trait LocationServiceTrait: Sync + Send {
    fn get_locations(
        &self,
        ctx: &ServiceContext,
        pagination: Option<PaginationOption>,
        filter: Option<LocationFilter>,
        sort: Option<LocationSort>,
    ) -> Result<ListResult<Location>, ListError> {
        get_locations(ctx, pagination, filter, sort)
    }

    fn get_location(
        &self,
        ctx: &ServiceContext,
        id: String,
    ) -> Result<Location, SingleRecordError> {
        get_location(ctx, id)
    }

    fn delete_location(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: DeleteLocation,
    ) -> Result<String, DeleteLocationError> {
        delete_location(ctx, store_id, input)
    }

    fn insert_location(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: InsertLocation,
    ) -> Result<Location, InsertLocationError> {
        insert_location(ctx, store_id, input)
    }

    fn update_location(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        input: UpdateLocation,
    ) -> Result<Location, UpdateLocationError> {
        update_location(ctx, store_id, input)
    }
}

pub struct LocationService {}
impl LocationServiceTrait for LocationService {}

#[cfg(test)]
mod tests;
