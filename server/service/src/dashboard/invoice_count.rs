use chrono::{
    DateTime, Datelike, FixedOffset, Local, NaiveDate, NaiveDateTime, TimeZone, Utc, Weekday,
};
use domain::{
    invoice::{InvoiceFilter, InvoiceStatus, InvoiceType},
    DatetimeFilter, EqualFilter,
};
use repository::{InvoiceQueryRepository, RepositoryError};

use crate::service_provider::ServiceContext;

pub struct InvoiceCountCreated {
    pub today: i64,
    pub this_week: i64,
}

#[derive(Debug)]
pub enum InvoiceCountError {
    RepositoryError(RepositoryError),
    BadTimezoneOffset,
}

pub trait InvoiceCountServiceTrait {
    /// Returns number of created invoices
    ///
    /// Arguments
    /// * now UTC DateTime that should be used for now (useful for testing)
    /// * timezone_offset offset in hours, if not specified the server local timezone is used
    fn created_invoices_count(
        &self,
        ctx: &ServiceContext,
        invoice_type: InvoiceType,
        now: DateTime<Utc>,
        timezone_offset: Option<i32>,
    ) -> Result<InvoiceCountCreated, InvoiceCountError>;

    fn outbound_invoices_pickable_count(
        &self,
        ctx: &ServiceContext,
    ) -> Result<i64, RepositoryError>;
}

impl From<RepositoryError> for InvoiceCountError {
    fn from(err: RepositoryError) -> Self {
        InvoiceCountError::RepositoryError(err)
    }
}

fn to_local(datetime: DateTime<Utc>, timezone: &FixedOffset) -> NaiveDateTime {
    datetime.with_timezone(timezone).naive_local()
}

fn to_utc(datetime: NaiveDateTime, timezone: &FixedOffset) -> Option<DateTime<Utc>> {
    let datetime_tz = timezone.from_local_datetime(&datetime).single()?;
    Some(DateTime::from(datetime_tz))
}

fn offset_to_timezone(timezone_offset: Option<i32>) -> Option<FixedOffset> {
    match timezone_offset {
        None => Some(Local::now().offset().clone()),
        Some(offset) => FixedOffset::east_opt(offset * 60 * 60),
    }
}

fn start_of_day(datetime: NaiveDateTime) -> NaiveDateTime {
    NaiveDate::from_ymd(datetime.year(), datetime.month(), datetime.day()).and_hms(0, 0, 0)
}

fn start_of_week(datetime: NaiveDateTime) -> NaiveDateTime {
    let current_year = datetime.year();
    let mon = NaiveDate::from_isoywd(current_year, datetime.iso_week().week(), Weekday::Mon)
        .and_hms(0, 0, 0);
    mon
}

pub struct InvoiceCountService {}

fn created_invoices_count(
    repo: &InvoiceQueryRepository,
    invoice_type: &InvoiceType,
    oldest: NaiveDateTime,
    earliest: Option<NaiveDateTime>,
) -> Result<i64, RepositoryError> {
    let mut creation_datetime_filter = DatetimeFilter {
        equal_to: None,
        before_or_equal_to: None,
        after_or_equal_to: Some(oldest),
    };
    if let Some(earliest) = earliest {
        creation_datetime_filter.before_or_equal_to = Some(earliest);
    }
    repo.count(Some(
        InvoiceFilter::new()
            .r#type(EqualFilter {
                equal_to: Some(invoice_type.clone()),
                not_equal_to: None,
                equal_any: None,
            })
            .created_datetime(creation_datetime_filter),
    ))
}

impl InvoiceCountServiceTrait for InvoiceCountService {
    fn created_invoices_count(
        &self,
        ctx: &ServiceContext,
        invoice_type: InvoiceType,
        now: DateTime<Utc>,
        timezone_offset: Option<i32>,
    ) -> Result<InvoiceCountCreated, InvoiceCountError> {
        let repo = InvoiceQueryRepository::new(&ctx.connection);
        let tz = offset_to_timezone(timezone_offset).ok_or(InvoiceCountError::BadTimezoneOffset)?;
        let now = to_local(now, &tz);

        let start_of_today =
            to_utc(start_of_day(now), &tz).ok_or(InvoiceCountError::BadTimezoneOffset)?;
        let start_of_this_week =
            to_utc(start_of_week(now), &tz).ok_or(InvoiceCountError::BadTimezoneOffset)?;

        let today = created_invoices_count(&repo, &invoice_type, start_of_today.naive_utc(), None)?;
        let this_week =
            created_invoices_count(&repo, &invoice_type, start_of_this_week.naive_utc(), None)?;
        Ok(InvoiceCountCreated { today, this_week })
    }

    fn outbound_invoices_pickable_count(
        &self,
        ctx: &ServiceContext,
    ) -> Result<i64, RepositoryError> {
        let repo = InvoiceQueryRepository::new(&ctx.connection);
        Ok(repo.count(Some(
            InvoiceFilter::new()
                .r#type(EqualFilter {
                    equal_to: Some(InvoiceType::OutboundShipment),
                    not_equal_to: None,
                    equal_any: None,
                })
                .status(EqualFilter {
                    equal_to: Some(InvoiceStatus::Picked),
                    not_equal_to: None,
                    equal_any: None,
                }),
        ))?)
    }
}

#[cfg(test)]
mod invoice_count_service_test {
    use repository::{
        mock::{
            mock_name_store_a, mock_name_store_b, mock_outbound_shipment_a, mock_store_b,
            MockDataInserts,
        },
        test_db, InvoiceRepository, NameRepository, StoreRepository,
    };

    use super::*;

    #[actix_rt::test]
    async fn test_created_invoice_count() {
        let (_, connection, _, _) = test_db::setup_all(
            "omsupply-database-created-invoice-count",
            MockDataInserts::none(),
        )
        .await;

        // setup exactly one invoice to test the time range
        let name_store_a = mock_name_store_a();
        let name_store_b = mock_name_store_b();
        let store_1 = mock_store_b();
        let invoice_1 = mock_outbound_shipment_a();
        let name_repo = NameRepository::new(&connection);
        name_repo.insert_one(&name_store_a).await.unwrap();
        name_repo.insert_one(&name_store_b).await.unwrap();
        let store_repo = StoreRepository::new(&connection);
        store_repo.insert_one(&store_1).await.unwrap();
        let invoice_repo = InvoiceRepository::new(&connection);
        invoice_repo.upsert_one(&invoice_1).unwrap();

        let repo = InvoiceQueryRepository::new(&connection);

        // oldest > item1.created_datetime
        let item1_type: InvoiceType = invoice_1.r#type.into();
        let count =
            created_invoices_count(&repo, &item1_type, Utc::now().naive_local(), None).unwrap();
        assert_eq!(0, count);
        // oldest = item1.created_datetime
        let count =
            created_invoices_count(&repo, &item1_type, invoice_1.created_datetime.clone(), None)
                .unwrap();
        assert_eq!(1, count);
        // oldest < item1.created_datetime
        let oldest = invoice_1.created_datetime - chrono::Duration::milliseconds(50);
        let count = created_invoices_count(&repo, &item1_type, oldest.clone(), None).unwrap();
        assert_eq!(1, count);
        // test that earliest exclude the invoice
        let earliest = invoice_1.created_datetime - chrono::Duration::milliseconds(20);
        let count =
            created_invoices_count(&repo, &item1_type, oldest.clone(), Some(earliest.clone()))
                .unwrap();
        assert_eq!(0, count);
    }

    #[actix_rt::test]
    async fn test_invoice_count_service() {
        let (_, connection, _, _) = test_db::setup_all(
            "omsupply-database-invoice_count_service",
            MockDataInserts::all(),
        )
        .await;
        let ctx = ServiceContext { connection };
        let service = InvoiceCountService {};

        // There are two invoice created at:
        // 1) UTC 2021_12_7 20:30 -> NZ 2021_12_8 13:30
        // 2) UTC 2021_12_8 08:30 -> NZ 2021_12_8 21:30

        let nz_tz_offset = 13;
        // Create UTC date that is already one day later in NZ time, i.e. both event should be
        // captured
        let test_now = Utc.ymd(2021, 12, 7).and_hms_milli(15, 30, 0, 0);
        let result = service
            .created_invoices_count(
                &ctx,
                InvoiceType::InboundShipment,
                test_now,
                Some(nz_tz_offset),
            )
            .unwrap();
        assert_eq!(result.today, 2);
        assert_eq!(result.this_week, 2);

        // Expect only one entry today in UTC tz
        let test_now = Utc.ymd(2021, 12, 8).and_hms_milli(15, 30, 0, 0);
        let result = service
            .created_invoices_count(&ctx, InvoiceType::InboundShipment, test_now, Some(0))
            .unwrap();
        assert_eq!(result.today, 1);
        assert_eq!(result.this_week, 2);
    }
}
