pub mod update;
pub use update::*;

use repository::IndicatorValueRow;

use crate::service_provider::ServiceContext;

pub trait IndicatorValueServiceTrait: Sync + Send {
    fn update_indicator_value(
        &self,
        ctx: &ServiceContext,
        input: UpdateIndicatorValue,
    ) -> Result<IndicatorValueRow, UpdateIndicatorValueError> {
        update_indicator_value(ctx, input)
    }
}

pub struct IndicatorValueService {}
impl IndicatorValueServiceTrait for IndicatorValueService {}
