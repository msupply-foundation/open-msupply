use repository::{
    EqualFilter, MasterListFilter, NameTagFilter, PeriodRow, PeriodRowRepository,
    ProgramRequisitionOrderTypeRow, ProgramRequisitionOrderTypeRowRepository,
    ProgramRequisitionSettings, ProgramRequisitionSettingsFilter,
    ProgramRequisitionSettingsRepository, ProgramSupplier, ProgramSupplierFilter,
    ProgramSupplierRepository, RepositoryError, RequisitionType, RequisitionsInPeriod,
    RequisitionsInPeriodFilter, RequisitionsInPeriodRepository,
};

use crate::service_provider::ServiceContext;

pub(super) struct PrepareProgramSettings {
    pub(super) settings: Vec<ProgramRequisitionSettings>,
    pub(super) program_suppliers: Vec<ProgramSupplier>,
    pub(super) order_types: Vec<ProgramRequisitionOrderTypeRow>,
    pub(super) periods: Vec<PeriodRow>,
    pub(super) requisitions_in_periods: Vec<RequisitionsInPeriod>,
}

/// Get program_settings, order_types, periods and requisitions_in_periods for a store
/// program_requisition_settings are matched to store by name_tag and by visibility of the program master_list
/// requisitions_in_periods are also querid so that order type can be
pub(super) fn prepare(
    ctx: &ServiceContext,
    store_id: &str,
) -> Result<Option<PrepareProgramSettings>, RepositoryError> {
    let equal_to_store_id = EqualFilter::equal_to(store_id);

    // Program Settings (for store)
    let filter = ProgramRequisitionSettingsFilter::new()
        .master_list(MasterListFilter::new().exists_for_store_id(equal_to_store_id.clone()))
        .name_tag(NameTagFilter::new().store_id(equal_to_store_id.clone()));

    let settings =
        ProgramRequisitionSettingsRepository::new(&ctx.connection).query(Some(filter))?;

    // Shouldn't try query everything else (early return)
    if settings.is_empty() {
        return Ok(None);
    }

    // Order Types (matching settings program_settings_ids)
    let program_requisition_settings_ids: Vec<String> = settings
        .iter()
        .map(|s| s.program_settings_row.id.clone())
        .collect();

    let program_ids: Vec<String> = settings.iter().map(|s| s.program_row.id.clone()).collect();

    let order_types = ProgramRequisitionOrderTypeRowRepository::new(&ctx.connection)
        .find_many_by_program_requisition_settings_ids(&program_requisition_settings_ids)?;

    // Periods (matching settings program_schedule_ids)
    let program_schedule_ids = settings
        .iter()
        .map(|s| s.program_settings_row.period_schedule_id.as_str())
        .collect();

    let periods = PeriodRowRepository::new(&ctx.connection)
        .find_many_by_program_schedule_ids(program_schedule_ids)?;

    let period_ids = periods.iter().map(|p| p.id.clone()).collect();

    // Requisitions in Period (for all periods and store)
    let filter = RequisitionsInPeriodFilter::new()
        .store_id(equal_to_store_id)
        .program_id(EqualFilter::equal_any(program_ids.clone()))
        .period_id(EqualFilter::equal_any(period_ids))
        .r#type(RequisitionType::Request.equal_to());

    let requisitions_in_periods =
        RequisitionsInPeriodRepository::new(&ctx.connection).query(filter)?;

    // Suppliers, which are visible in current store and have these program (this is determined by having program master list visible)
    // TODO confirm if they are strictly stores, i.e. can't make internal program order (requisition) to a non store supplier
    let filter = ProgramSupplierFilter::new().program_id(EqualFilter::equal_any(program_ids));
    let program_suppliers =
        ProgramSupplierRepository::new(&ctx.connection).query(store_id, filter)?;

    Ok(Some(PrepareProgramSettings {
        settings,
        order_types,
        periods,
        requisitions_in_periods,
        program_suppliers,
    }))
}
