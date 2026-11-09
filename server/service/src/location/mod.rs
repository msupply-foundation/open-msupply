use self::{
    delete::{DeleteLocation, DeleteLocationError, delete_location},
    insert::{InsertLocation, InsertLocationError, insert_location},
    query::{get_location, get_locations},
    update::{UpdateLocation, UpdateLocationError, update_location},
};

use super::{ListError, ListResult};
use crate::{SingleRecordError, service_provider::ServiceContext};
use repository::PaginationOption;
use repository::location::{Location, LocationFilter, LocationSort};

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
        input: DeleteLocation,
    ) -> Result<String, DeleteLocationError> {
        delete_location(ctx, input)
    }

    fn insert_location(
        &self,
        ctx: &ServiceContext,
        input: InsertLocation,
    ) -> Result<Location, InsertLocationError> {
        insert_location(ctx, input)
    }

    fn update_location(
        &self,
        ctx: &ServiceContext,
        input: UpdateLocation,
    ) -> Result<Location, UpdateLocationError> {
        update_location(ctx, input)
    }
}

pub struct LocationService {}
impl LocationServiceTrait for LocationService {}

#[cfg(test)]
mod tests;
