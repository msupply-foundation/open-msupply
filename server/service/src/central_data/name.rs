use super::{
    CentralDataTable, Change, ExportFilter, ImportTable, RecordCount, RowFailure, RowOutcome,
    SheetImport, SheetStart,
    cells::{Row, RowError, choice_cell, collect, keep_or_saved, one_of},
    delete::{DELETE, DELETE_COLUMN, already_deleted, check_delete, is_delete},
    fail_if_any, field_changes,
    lookup::{
        InMemory, LookupError, NamesOfType, active_first, find_record, find_reference,
        lookup_reference_record, record_conflict,
    },
    name_with_code,
    sheet::Value,
};
use crate::{
    i64_to_u32,
    name::upsert::{
        DeleteNameError, UpsertNameError, delete_name, name_errors, upsert_name_unchecked,
    },
};
use chrono::NaiveDateTime;
use repository::{
    CurrencyRow, CurrencyRowRepository, EqualFilter, NameRow, NameRowFilter, NameRowRepository,
    NameRowType, NameUser, RepositoryError, StorageConnection, StoreRow, StoreRowRepository,
    StringFilter,
};
use util::uuid::uuid;

const ID: &str = "id";
const CODE: &str = "code";
const TYPE: &str = "type";
const NAME: &str = "name";
const IS_CUSTOMER: &str = "is_customer";
const IS_SUPPLIER: &str = "is_supplier";
const SUPPLYING_STORE_CODE: &str = "supplying_store_code";
const SUPPLYING_STORE_ID: &str = "supplying_store_id";
const PHONE: &str = "phone";
const CHARGE_CODE: &str = "charge_code";
const COMMENT: &str = "comment";
const COUNTRY: &str = "country";
const ADDRESS1: &str = "address1";
const ADDRESS2: &str = "address2";
const EMAIL: &str = "email";
const WEBSITE: &str = "website";
const IS_MANUFACTURER: &str = "is_manufacturer";
const IS_DONOR: &str = "is_donor";
const ON_HOLD: &str = "on_hold";
const CUSTOM_DATA: &str = "custom_data";
const HSH_CODE: &str = "hsh_code";
const HSH_NAME: &str = "hsh_name";
const MARGIN: &str = "margin";
const FREIGHT_FACTOR: &str = "freight_factor";
const CURRENCY_CODE: &str = "currency_code";
const CURRENCY_ID: &str = "currency_id";
const CREATED_DATETIME: &str = "created_datetime";
const DELETED_DATETIME: &str = "deleted_datetime";

const COLUMNS: &[&str] = &[
    ID,
    CODE,
    TYPE,
    NAME,
    IS_CUSTOMER,
    IS_SUPPLIER,
    SUPPLYING_STORE_CODE,
    SUPPLYING_STORE_ID,
    PHONE,
    CHARGE_CODE,
    COMMENT,
    COUNTRY,
    ADDRESS1,
    ADDRESS2,
    EMAIL,
    WEBSITE,
    IS_MANUFACTURER,
    IS_DONOR,
    ON_HOLD,
    CUSTOM_DATA,
    HSH_CODE,
    HSH_NAME,
    MARGIN,
    FREIGHT_FACTOR,
    CURRENCY_CODE,
    CURRENCY_ID,
    DELETE_COLUMN,
];

/// No `PATIENT`: patients are imported on their own.
pub(super) const TYPES: &[(&str, NameRowType)] = &[
    ("FACILITY", NameRowType::Facility),
    ("BUILD", NameRowType::Build),
    ("INVAD", NameRowType::Invad),
    ("REPACK", NameRowType::Repack),
    ("STORE", NameRowType::Store),
    ("OTHERS", NameRowType::Others),
];

/// Matched by `id`, else `code` and `type` together. On an update a blank cell keeps the value,
/// except in the optional columns, where it clears it. Deleted names export with `DELETE`, so they
/// import unchanged; a row without `DELETE` restores one. Patients and system names are neither
/// exported nor imported.
pub(super) struct NameTable;

impl ImportTable for NameTable {
    fn table(&self) -> CentralDataTable {
        CentralDataTable::Name
    }

    fn columns(&self) -> &'static [&'static str] {
        COLUMNS
    }

    fn text_columns(&self) -> &'static [&'static str] {
        &[
            ID,
            CODE,
            NAME,
            SUPPLYING_STORE_CODE,
            SUPPLYING_STORE_ID,
            PHONE,
            CHARGE_CODE,
            COMMENT,
            COUNTRY,
            ADDRESS1,
            ADDRESS2,
            EMAIL,
            WEBSITE,
            CUSTOM_DATA,
            HSH_CODE,
            HSH_NAME,
            CURRENCY_CODE,
            CURRENCY_ID,
            DELETE_COLUMN,
            CREATED_DATETIME,
            DELETED_DATETIME,
        ]
    }

    fn export_only_columns(&self) -> &'static [&'static str] {
        &[CREATED_DATETIME, DELETED_DATETIME]
    }

    fn export(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<Vec<Vec<Value>>, RepositoryError> {
        let references = References::load(connection)?;
        // Read whole, not paged: the export has already checked the row cap.
        Ok(NameRowRepository::new(connection)
            .query_by_filter(name_filter(filter))?
            .into_iter()
            .map(|name| {
                let mut row = cells(&name, &references);
                row.push(datetime_cell(name.created_datetime));
                row.push(datetime_cell(name.deleted_datetime));
                row
            })
            .collect())
    }

    fn count(
        &self,
        connection: &StorageConnection,
        filter: &ExportFilter,
    ) -> Result<RecordCount, RepositoryError> {
        let repo = NameRowRepository::new(connection);
        Ok(RecordCount {
            matching: i64_to_u32(repo.count_by_filter(name_filter(filter))?),
            total: i64_to_u32(repo.count_by_filter(exportable())?),
        })
    }

    fn start_sheet(
        &self,
        connection: &StorageConnection,
        start: SheetStart,
    ) -> Result<Box<dyn SheetImport>, RepositoryError> {
        Ok(Box::new(NameSheet {
            references: References::load(connection)?,
            store_sheet_follows: start.sheets_after.contains(&CentralDataTable::Store),
            later: Vec::new(),
        }))
    }
}

struct NameSheet {
    references: References,
    /// Whether the file's store sheet runs after this one, and may add a supplying store.
    store_sheet_follows: bool,
    later: Vec<LaterStore>,
}

/// A supplying store that isn't saved yet, found once every sheet has run, as the store sheet
/// comes after the name sheet and may add it. The name keeps its saved one until then.
struct LaterStore {
    name_id: String,
    sheet: String,
    row: u32,
    code: Option<String>,
    id: Option<String>,
}

/// Read once: both are small, and neither changes while the name sheet runs.
struct References {
    stores: InMemory<StoreRow>,
    currencies: InMemory<CurrencyRow>,
}

impl References {
    fn load(connection: &StorageConnection) -> Result<Self, RepositoryError> {
        Ok(Self {
            stores: InMemory::new(StoreRowRepository::new(connection).all()?),
            currencies: InMemory::new(CurrencyRowRepository::new(connection).find_all()?),
        })
    }
}

impl SheetImport for NameSheet {
    fn import_row(
        &mut self,
        connection: &StorageConnection,
        row: &Row,
    ) -> Result<RowOutcome, RowFailure> {
        let mut errors = Vec::new();
        let delete = collect(&mut errors, is_delete(row));
        let r#type = collect(&mut errors, row.choice(TYPE, TYPES));
        let is_customer = collect(&mut errors, row.bool(IS_CUSTOMER));
        let is_supplier = collect(&mut errors, row.bool(IS_SUPPLIER));
        let is_manufacturer = collect(&mut errors, row.bool(IS_MANUFACTURER));
        let is_donor = collect(&mut errors, row.bool(IS_DONOR));
        let on_hold = collect(&mut errors, row.bool(ON_HOLD));
        let margin = collect(&mut errors, row.number(MARGIN));
        let freight_factor = collect(&mut errors, row.number(FREIGHT_FACTOR));
        let id = row.text(ID);
        let code = row.text(CODE);

        // Before `find_record`, which looks only within the row's type: a patient or a type change
        // gets its own error, and a new id beside another type's code still adds a name.
        let repo = NameRowRepository::new(connection);
        if let Some(id) = &id
            && let Some(saved) = repo.find_one_by_id(id)?
        {
            if saved.r#type == NameRowType::Patient {
                errors.push(patient_error(row, &saved));
                return Err(RowFailure::Invalid(errors));
            }
            if let Some(r#type) = r#type.as_ref().filter(|r#type| **r#type != saved.r#type) {
                errors.push(row.error(
                    TYPE,
                    record_conflict(
                        TYPE,
                        &name_with_code(&saved.name, &saved.code),
                        &type_label(&saved.r#type),
                        &saved.id,
                        &type_label(r#type),
                        id,
                    ),
                ));
                return Err(RowFailure::Invalid(errors));
            }
        }
        // Without its record, the row's other checks would treat it as a new name.
        let existing = match find_record(
            &NamesOfType {
                repo: NameRowRepository::new(connection),
                r#type: r#type.clone(),
            },
            row,
            CODE,
            id.as_deref(),
            code.as_deref(),
            |saved| &saved.name,
            // Never a patient; a deleted name doesn't make a live one's code ambiguous.
            |names| {
                let names = names
                    .into_iter()
                    .filter(|name| name.r#type != NameRowType::Patient)
                    .collect();
                active_first(names, |name| name.deleted_datetime.is_none())
            },
        )? {
            Ok(existing) => existing,
            Err(e) => {
                errors.push(e);
                return Err(RowFailure::Invalid(errors));
            }
        };
        let saved = existing.as_ref();
        // Here, not only in the save, as an unchanged row isn't saved.
        if let Some(saved) = saved.filter(|saved| saved.is_system_name()) {
            errors.push(protected_error(row, &saved.name));
            return Err(RowFailure::Invalid(errors));
        }

        // Looked up for a `DELETE` row too, so a missing reference stops the import. One that
        // isn't saved may be on a store sheet that follows, except a `DELETE` row's.
        let mut later_store = None;
        let supplying_store_id = if keeps_saved_store(row, saved)
            || !(row.has(SUPPLYING_STORE_CODE) || row.has(SUPPLYING_STORE_ID))
        {
            None
        } else {
            let code = row.text(SUPPLYING_STORE_CODE);
            let id = row.text(SUPPLYING_STORE_ID);
            match find_supplying_store(
                &self.references.stores,
                row.sheet,
                row.number,
                code.as_deref(),
                id.as_deref(),
            )? {
                Ok(store_id) => Some(store_id),
                // Without a store sheet, a store no code or id finds is saved by its id, as sync
                // saves it: the store may arrive later.
                Err((true, _))
                    if !self.store_sheet_follows
                        && id.is_some()
                        && code.as_deref().is_none_or(|code| {
                            self.references.stores.with_key(code).is_empty()
                        }) =>
                {
                    Some(id.clone())
                }
                Err((true, _)) if !delete && self.store_sheet_follows => {
                    later_store = Some((code, id));
                    None
                }
                Err((_, error)) => {
                    errors.push(error);
                    None
                }
            }
        };
        let currency_id = collect(
            &mut errors,
            find_reference(
                &self.references.currencies,
                row,
                CURRENCY_CODE,
                CURRENCY_ID,
                |currencies| active_first(currencies, |currency| currency.is_active),
            )?,
        );
        if delete {
            return self.delete(connection, row, existing, errors);
        }

        let code = keep_or_saved(code, saved.map(|name| name.code.as_str()));
        let name = keep_or_saved(row.text(NAME), saved.map(|name| name.name.as_str()));
        let r#type = r#type.or(saved.map(|name| name.r#type.clone()));
        let is_customer = is_customer.or(saved.map(|name| name.is_customer));
        let is_supplier = is_supplier.or(saved.map(|name| name.is_supplier));
        let is_manufacturer = is_manufacturer.or(saved.map(|name| name.is_manufacturer));
        let is_donor = is_donor.or(saved.map(|name| name.is_donor));
        let on_hold = on_hold.or(saved.map(|name| name.on_hold));
        row.require_for_new_with_choices(
            &mut errors,
            "name",
            &[
                (CODE, code.is_none()),
                (TYPE, r#type.is_none()),
                (NAME, name.is_none()),
                (IS_CUSTOMER, is_customer.is_none()),
                (IS_SUPPLIER, is_supplier.is_none()),
                (IS_MANUFACTURER, is_manufacturer.is_none()),
                (IS_DONOR, is_donor.is_none()),
                (ON_HOLD, on_hold.is_none()),
            ],
            &[(TYPE, || one_of(TYPES))],
        );

        let text = |column: &str, value: fn(&NameRow) -> &Option<String>| {
            row.optional_text(column, saved.and_then(|name| value(name).as_deref()))
        };
        let new = NameRow {
            id: saved
                .map(|name| name.id.clone())
                .or(id)
                .unwrap_or_else(uuid),
            name: name.unwrap_or_default(),
            code: code.unwrap_or_default(),
            r#type: r#type.unwrap_or_default(),
            is_customer: is_customer.unwrap_or_default(),
            is_supplier: is_supplier.unwrap_or_default(),
            supplying_store_id: supplying_store_id
                .unwrap_or_else(|| saved.and_then(|name| name.supplying_store_id.clone())),
            phone: text(PHONE, |name| &name.phone),
            charge_code: text(CHARGE_CODE, |name| &name.charge_code),
            comment: text(COMMENT, |name| &name.comment),
            country: text(COUNTRY, |name| &name.country),
            address1: text(ADDRESS1, |name| &name.address1),
            address2: text(ADDRESS2, |name| &name.address2),
            email: text(EMAIL, |name| &name.email),
            website: text(WEBSITE, |name| &name.website),
            is_manufacturer: is_manufacturer.unwrap_or_default(),
            is_donor: is_donor.unwrap_or_default(),
            on_hold: on_hold.unwrap_or_default(),
            custom_data_string: text(CUSTOM_DATA, |name| &name.custom_data_string),
            hsh_code: text(HSH_CODE, |name| &name.hsh_code),
            hsh_name: text(HSH_NAME, |name| &name.hsh_name),
            margin: row.optional(MARGIN, margin.map(Some), saved.map(|name| name.margin)),
            freight_factor: row.optional(
                FREIGHT_FACTOR,
                freight_factor.map(Some),
                saved.map(|name| name.freight_factor),
            ),
            currency_id: currency_id
                .unwrap_or_else(|| saved.and_then(|name| name.currency_id.clone())),
            // Export-only: the save sets it on a new name.
            created_datetime: saved.and_then(|name| name.created_datetime),
            // A row without `DELETE` restores a deleted name.
            deleted_datetime: None,
            // No column: kept as saved.
            ..saved.cloned().unwrap_or_default()
        };

        let written = Change::between_upserts(saved, &new);
        if written != Change::Unchanged {
            for error in name_errors(connection, saved, &new)? {
                let reads = reads(&error);
                upsert_failure(row, &new, error).add_rule(reads, &mut errors)?;
            }
        }
        fail_if_any(&mut errors)?;
        if written != Change::Unchanged {
            upsert_name_unchecked(connection, saved, &new)?;
        }
        // Counted now, though written once the store is found. Given only a code, it's taken to
        // differ from the saved one, as the store's id isn't known yet.
        let store_changes_later = later_store
            .as_ref()
            .is_some_and(|(_, id)| id.as_deref() != new.supplying_store_id.as_deref());
        let change = match written {
            Change::Updated if saved.is_some_and(|saved| saved.deleted_datetime.is_some()) => {
                Change::Restored
            }
            Change::Unchanged if store_changes_later => Change::Updated,
            change => change,
        };

        let mut new_cells = cells(&new, &self.references);
        if let Some((code, id)) = later_store {
            // As the row gives it; an id it doesn't give isn't known yet.
            let column = |name: &str| COLUMNS.iter().position(|c| *c == name).expect("a column");
            new_cells[column(SUPPLYING_STORE_CODE)] = code.clone().into();
            if id.is_some() {
                new_cells[column(SUPPLYING_STORE_ID)] = id.clone().into();
            }
            self.later.push(LaterStore {
                name_id: new.id.clone(),
                sheet: row.sheet.to_string(),
                row: row.number,
                code,
                id,
            });
        }
        Ok(RowOutcome {
            fields: existing
                .map(|saved| field_changes(COLUMNS, cells(&saved, &self.references), new_cells))
                .unwrap_or_default(),
            record: name_with_code(&new.name, &new.code),
            record_id: new.id,
            change,
        })
    }

    fn finish_file(
        &mut self,
        connection: &StorageConnection,
    ) -> Result<Vec<RowError>, RepositoryError> {
        self.find_later_stores(connection)
    }
}

impl NameSheet {
    /// After the store sheet, which may have added the stores `later` refers to.
    fn find_later_stores(
        &mut self,
        connection: &StorageConnection,
    ) -> Result<Vec<RowError>, RepositoryError> {
        if self.later.is_empty() {
            return Ok(Vec::new());
        }
        let stores = InMemory::new(StoreRowRepository::new(connection).all()?);
        let names = NameRowRepository::new(connection);
        let mut errors = Vec::new();
        for later in self.later.drain(..) {
            let store_id = match find_supplying_store(
                &stores,
                &later.sheet,
                later.row,
                later.code.as_deref(),
                later.id.as_deref(),
            )? {
                Ok(store_id) => store_id,
                Err((_, error)) => {
                    errors.push(error);
                    continue;
                }
            };
            let Some(saved) = names.find_one_by_id(&later.name_id)? else {
                continue;
            };
            if saved.supplying_store_id == store_id {
                continue;
            }
            // Its row passed `name_errors`, which doesn't check the store, just found.
            let name = NameRow {
                supplying_store_id: store_id,
                ..saved.clone()
            };
            upsert_name_unchecked(connection, Some(&saved), &name)?;
        }
        Ok(errors)
    }

    fn delete(
        &self,
        connection: &StorageConnection,
        row: &Row,
        existing: Option<NameRow>,
        errors: Vec<RowError>,
    ) -> Result<RowOutcome, RowFailure> {
        // Already deleted, as an exported deleted name is: unchanged.
        let Some(saved) = existing.filter(|saved| saved.deleted_datetime.is_none()) else {
            return already_deleted(row, CODE, errors);
        };
        check_delete(
            row,
            COLUMNS,
            &[TYPE],
            cells(&saved, &self.references),
            errors,
        )?;

        let record = name_with_code(&saved.name, &saved.code);
        delete_name(connection, &saved.id).map_err(|error| match error {
            DeleteNameError::InUse(user) => row
                .error(
                    DELETE_COLUMN,
                    format!(
                        "{record} is used by {}, so it can't be deleted",
                        match user {
                            NameUser::Store => "a store, as its name",
                            NameUser::Invoice => "an invoice",
                            NameUser::InvoiceLine =>
                                "an invoice line, as its donor or manufacturer",
                            NameUser::Requisition => {
                                "a requisition, as its other party or destination customer"
                            }
                            NameUser::PurchaseOrder => "a purchase order",
                            NameUser::PurchaseOrderLine =>
                                "a purchase order line, as its manufacturer",
                            NameUser::StockLine => "a stock line",
                            NameUser::StocktakeLine =>
                                "a stocktake line, as its donor or manufacturer",
                            NameUser::RnrForm => "an R&R form",
                            NameUser::IndicatorValue => "an indicator value, as its customer",
                            NameUser::ItemVariant => "an item variant, as its manufacturer",
                            NameUser::BarcodeProposal => "a barcode, as its manufacturer",
                            NameUser::Asset => "an asset, as its donor",
                            NameUser::Vaccination => "a vaccination, as where it was given",
                        }
                    ),
                )
                .into(),
            // Unreachable here: `import_row` refuses a system name first.
            DeleteNameError::Protected => protected_error(row, &saved.name).into(),
            DeleteNameError::DatabaseError(error) => RowFailure::Database(error),
        })?;
        Ok(RowOutcome {
            record,
            record_id: saved.id,
            change: Change::Deleted,
            fields: Vec::new(),
        })
    }
}

/// The supplying store a row's `code` and `id` find among `stores`. Failing, the error on that row,
/// after whether the store just isn't found, as a later sheet may add it.
fn find_supplying_store(
    stores: &InMemory<StoreRow>,
    sheet: &str,
    row: u32,
    code: Option<&str>,
    id: Option<&str>,
) -> Result<Result<Option<String>, (bool, RowError)>, RepositoryError> {
    Ok(
        lookup_reference_record(stores, id, code, std::convert::identity)?
            .map(|store| store.map(|store| store.id))
            .map_err(|error| {
                (
                    error.error == LookupError::NotFound,
                    error.to_row_error(
                        sheet,
                        row,
                        SUPPLYING_STORE_CODE,
                        SUPPLYING_STORE_ID,
                        code,
                        id,
                    ),
                )
            }),
    )
}

/// Whether the row gives only the saved supplying store's id, as exported for a store sync hasn't
/// brought yet.
fn keeps_saved_store(row: &Row, saved: Option<&NameRow>) -> bool {
    row.text(SUPPLYING_STORE_CODE).is_none()
        && row.text(SUPPLYING_STORE_ID).is_some_and(|id| {
            saved.and_then(|name| name.supplying_store_id.as_deref()) == Some(id.as_str())
        })
}

fn protected_error(row: &Row, name: &str) -> RowError {
    row.error(
        row.found_by(CODE),
        format!("{name} is a system name, as the server needs it, so import can't change it"),
    )
}

fn patient_error(row: &Row, patient: &NameRow) -> RowError {
    row.error(
        row.found_by(CODE),
        format!(
            "{} is a patient. Patients aren't imported on the name sheet",
            name_with_code(&patient.name, &patient.code)
        ),
    )
}

/// The columns `error`'s rule reads beside the one it's reported on.
fn reads(error: &UpsertNameError) -> &'static [&'static str] {
    match error {
        // Codes are unique within a type.
        UpsertNameError::DuplicateCode { .. } => &[TYPE],
        _ => &[],
    }
}

fn upsert_failure(row: &Row, name: &NameRow, error: UpsertNameError) -> RowFailure {
    match error {
        UpsertNameError::CodeRequired => row.error(CODE, "code is required").into(),
        UpsertNameError::NameRequired => row.error(NAME, "name is required").into(),
        UpsertNameError::DuplicateCode { other_id } => row
            .error(
                CODE,
                format!(
                    "Name {other_id} already has code {} and type {}",
                    name.code,
                    type_label(&name.r#type)
                ),
            )
            .into(),
        // A new name given a system name's code; a saved one is refused by `import_row`.
        UpsertNameError::Protected => row
            .error(
                CODE,
                "This code belongs to a system name, which the server needs",
            )
            .into(),
        UpsertNameError::InvalidCustomData => row
            .error(CUSTOM_DATA, "custom_data must be JSON, or blank")
            .into(),
    }
}

pub(super) fn type_label(r#type: &NameRowType) -> String {
    match choice_cell(TYPES, r#type) {
        Value::Text(label) => label,
        _ => format!("{:?}", r#type).to_uppercase(),
    }
}

/// Saved in UTC, so written with a `Z`.
fn datetime_cell(datetime: Option<NaiveDateTime>) -> Value {
    datetime
        .map(|datetime| datetime.format("%Y-%m-%dT%H:%M:%SZ").to_string())
        .into()
}

/// Neither a patient nor a system name; deleted names included.
fn exportable() -> NameRowFilter {
    NameRowFilter {
        r#type: Some(EqualFilter {
            not_equal_to: Some(NameRowType::Patient),
            ..Default::default()
        }),
        is_system_name: Some(false),
        ..Default::default()
    }
}

/// Names can be many, so they're filtered and counted in SQL.
fn name_filter(filter: &ExportFilter) -> NameRowFilter {
    let mut name_filter = exportable();
    if let Some(text) = filter.contains.as_deref().map(str::trim)
        && !text.is_empty()
    {
        name_filter.code_or_name = Some(StringFilter::like(text));
    }
    name_filter
}

/// One per column, as the export writes them and the preview shows them. The export adds
/// `created_datetime` and `deleted_datetime`.
fn cells(name: &NameRow, references: &References) -> Vec<Value> {
    let store_code = name
        .supplying_store_id
        .as_deref()
        .and_then(|id| references.stores.get(id))
        .map(|store| store.code.clone());
    let currency_code = name
        .currency_id
        .as_deref()
        .and_then(|id| references.currencies.get(id))
        .map(|currency| currency.code.clone());
    vec![
        name.id.clone().into(),
        name.code.clone().into(),
        choice_cell(TYPES, &name.r#type),
        name.name.clone().into(),
        name.is_customer.into(),
        name.is_supplier.into(),
        store_code.into(),
        name.supplying_store_id.clone().into(),
        name.phone.clone().into(),
        name.charge_code.clone().into(),
        name.comment.clone().into(),
        name.country.clone().into(),
        name.address1.clone().into(),
        name.address2.clone().into(),
        name.email.clone().into(),
        name.website.clone().into(),
        name.is_manufacturer.into(),
        name.is_donor.into(),
        name.on_hold.into(),
        name.custom_data_string.clone().into(),
        name.hsh_code.clone().into(),
        name.hsh_name.clone().into(),
        name.margin.map_or(Value::Empty, Value::Number),
        name.freight_factor.map_or(Value::Empty, Value::Number),
        currency_code.into(),
        name.currency_id.clone().into(),
        match name.deleted_datetime {
            Some(_) => Value::Text(DELETE.to_string()),
            None => Value::Empty,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    // A type missing from TYPES would export blank and fail to import back.
    #[test]
    fn every_type_but_patient_has_a_choice() {
        for r#type in [
            NameRowType::Facility,
            NameRowType::Patient,
            NameRowType::Build,
            NameRowType::Invad,
            NameRowType::Repack,
            NameRowType::Store,
            NameRowType::Others,
        ] {
            // Fails to compile when a type is added, so it's listed here too.
            let is_name = match r#type {
                NameRowType::Patient => false,
                NameRowType::Facility
                | NameRowType::Build
                | NameRowType::Invad
                | NameRowType::Repack
                | NameRowType::Store
                | NameRowType::Others => true,
            };
            assert_eq!(
                TYPES.iter().any(|(_, choice)| *choice == r#type),
                is_name,
                "{:?}",
                r#type
            );
        }
    }
}
