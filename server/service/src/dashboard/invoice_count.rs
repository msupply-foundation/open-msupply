use chrono::{DateTime, Datelike, FixedOffset, NaiveDate, NaiveDateTime, TimeZone, Utc, Weekday};
use repository::{DatetimeFilter, EqualFilter};
use repository::{InvoiceFilter, InvoiceRepository, InvoiceStatus, InvoiceType, RepositoryError};

use crate::service_provider::ServiceContext;

#[derive(Debug)]
pub enum InvoiceCountError {
    RepositoryError(RepositoryError),
    BadTimezoneOffset,
}

pub enum CountTimeRange {
    Today,
    ThisWeek,
}

pub trait InvoiceCountServiceTrait: Send + Sync {
    /// Returns number of invoices of a certain status for today
    ///
    /// Arguments
    /// * invoice_status the status change in the requested time range (not the current status)
    /// * now UTC DateTime that should be used for now (useful for testing)
    /// * timezone_offset offset in hours, if not specified the server local timezone is used
    fn invoices_count(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        invoice_type: &InvoiceType,
        invoice_status: &InvoiceStatus,
        range: &CountTimeRange,
        now: &DateTime<Utc>,
        timezone_offset: &FixedOffset,
    ) -> Result<i64, InvoiceCountError> {
        // default implementation:
        InvoiceCountService {}.invoices_count(
            ctx,
            store_id,
            invoice_type,
            invoice_status,
            range,
            now,
            timezone_offset,
        )
    }

    fn outbound_invoices_not_shipped_count(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
    ) -> Result<i64, RepositoryError> {
        // default implementation:
        InvoiceCountService {}.outbound_invoices_not_shipped_count(ctx, store_id)
    }

    fn inbound_invoices_not_delivered_count(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
    ) -> Result<i64, RepositoryError> {
        InvoiceCountService {}.inbound_invoices_not_delivered_count(ctx, store_id)
    }
}

impl From<RepositoryError> for InvoiceCountError {
    fn from(err: RepositoryError) -> Self {
        InvoiceCountError::RepositoryError(err)
    }
}

fn to_local(datetime: &DateTime<Utc>, timezone: &FixedOffset) -> NaiveDateTime {
    datetime.with_timezone(timezone).naive_local()
}

fn to_utc(datetime: &NaiveDateTime, timezone: &FixedOffset) -> Option<DateTime<Utc>> {
    let datetime_tz = timezone.from_local_datetime(datetime).single()?;
    Some(DateTime::from(datetime_tz))
}

fn start_of_day(datetime: &NaiveDateTime) -> NaiveDateTime {
    NaiveDate::from_ymd_opt(datetime.year(), datetime.month(), datetime.day())
        .unwrap()
        .and_hms_opt(0, 0, 0)
        .unwrap()
}

fn start_of_week(datetime: &NaiveDateTime) -> NaiveDateTime {
    let current_year = datetime.year();
    NaiveDate::from_isoywd_opt(current_year, datetime.iso_week().week(), Weekday::Mon)
        .unwrap()
        .and_hms_opt(0, 0, 0)
        .unwrap()
}

pub struct InvoiceCountService {}

fn invoices_count(
    repo: &InvoiceRepository,
    invoice_type: &InvoiceType,
    invoice_status: &InvoiceStatus,
    oldest: NaiveDateTime,
    earliest: Option<NaiveDateTime>,
    store_id: &str,
) -> Result<i64, RepositoryError> {
    let mut datetime_filter = DatetimeFilter::after_or_equal_to(oldest);

    if let Some(earliest) = earliest {
        datetime_filter.before_or_equal_to = Some(earliest);
    }
    let mut invoice_filter = InvoiceFilter::new()
        .r#type(invoice_type.equal_to())
        .store_id(EqualFilter::equal_to(store_id));
    match invoice_status {
        InvoiceStatus::New => invoice_filter = invoice_filter.created_datetime(datetime_filter),
        InvoiceStatus::Allocated => {
            invoice_filter = invoice_filter.allocated_datetime(datetime_filter)
        }
        InvoiceStatus::Picked => invoice_filter = invoice_filter.picked_datetime(datetime_filter),
        InvoiceStatus::Shipped => invoice_filter = invoice_filter.shipped_datetime(datetime_filter),
        InvoiceStatus::Delivered => {
            invoice_filter = invoice_filter.delivered_datetime(datetime_filter)
        }
        InvoiceStatus::Verified => {
            invoice_filter = invoice_filter.verified_datetime(datetime_filter)
        }
    }
    repo.count(Some(invoice_filter))
}

impl InvoiceCountServiceTrait for InvoiceCountService {
    fn invoices_count(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
        invoice_type: &InvoiceType,
        invoice_status: &InvoiceStatus,
        range: &CountTimeRange,
        now: &DateTime<Utc>,
        timezone_offset: &FixedOffset,
    ) -> Result<i64, InvoiceCountError> {
        let repo = InvoiceRepository::new(&ctx.connection);
        let now = to_local(now, timezone_offset);
        let oldest = match range {
            CountTimeRange::Today => to_utc(&start_of_day(&now), timezone_offset)
                .ok_or(InvoiceCountError::BadTimezoneOffset)?,
            CountTimeRange::ThisWeek => to_utc(&start_of_week(&now), timezone_offset)
                .ok_or(InvoiceCountError::BadTimezoneOffset)?,
        };
        let count = invoices_count(
            &repo,
            invoice_type,
            invoice_status,
            oldest.naive_utc(),
            None,
            store_id,
        )?;
        Ok(count)
    }

    fn outbound_invoices_not_shipped_count(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
    ) -> Result<i64, RepositoryError> {
        let repo = InvoiceRepository::new(&ctx.connection);
        repo.count(Some(
            InvoiceFilter::new()
                .store_id(EqualFilter::equal_to(store_id))
                .r#type(InvoiceType::OutboundShipment.equal_to())
                .status(InvoiceStatus::equal_any(vec![
                    InvoiceStatus::New,
                    InvoiceStatus::Allocated,
                    InvoiceStatus::Picked,
                ])),
        ))
    }

    fn inbound_invoices_not_delivered_count(
        &self,
        ctx: &ServiceContext,
        store_id: &str,
    ) -> Result<i64, RepositoryError> {
        let repo = InvoiceRepository::new(&ctx.connection);
        repo.count(Some(
            InvoiceFilter::new()
                .store_id(EqualFilter::equal_to(store_id))
                .r#type(InvoiceType::InboundShipment.equal_to())
                .status(InvoiceStatus::Shipped.equal_to()),
        ))
    }
}

#[cfg(test)]
mod invoice_count_service_test {
    use repository::{
        mock::{
            currency_a, mock_name_store_a, mock_name_store_b, mock_outbound_shipment_a,
            mock_store_b, MockDataInserts,
        },
        test_db, CurrencyRowRepository, InvoiceRowRepository, NameRowRepository,
        StoreRowRepository,
    };
    use util::timezone::offset_to_timezone;

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
        let invalid_store_id = "invalid_store_id";
        let invoice_1 = mock_outbound_shipment_a();
        let name_repo = NameRowRepository::new(&connection);
        name_repo.insert_one(&name_store_a).await.unwrap();
        name_repo.insert_one(&name_store_b).await.unwrap();

        let store_repo = StoreRowRepository::new(&connection);
        store_repo.insert_one(&store_1).await.unwrap();
        CurrencyRowRepository::new(&connection)
            .upsert_one(&currency_a())
            .unwrap();
        let invoice_repo = InvoiceRowRepository::new(&connection);
        invoice_repo.upsert_one(&invoice_1).unwrap();

        let repo = InvoiceRepository::new(&connection);
        let status = InvoiceStatus::New;

        // oldest > item1.created_datetime
        let item1_type: InvoiceType = invoice_1.r#type;
        let count = invoices_count(
            &repo,
            &item1_type,
            &status,
            Utc::now().naive_utc(),
            None,
            &store_1.id,
        )
        .unwrap();
        assert_eq!(0, count);
        // oldest = item1.created_datetime
        let count = invoices_count(
            &repo,
            &item1_type,
            &status,
            invoice_1.created_datetime,
            None,
            &store_1.id,
        )
        .unwrap();
        assert_eq!(1, count);
        // oldest < item1.created_datetime
        let oldest = invoice_1.created_datetime - chrono::Duration::milliseconds(50);
        let count = invoices_count(&repo, &item1_type, &status, oldest, None, &store_1.id).unwrap();
        assert_eq!(1, count);
        // test that earliest exclude the invoice
        let earliest = invoice_1.created_datetime - chrono::Duration::milliseconds(20);
        let count = invoices_count(
            &repo,
            &item1_type,
            &status,
            oldest,
            Some(earliest),
            &store_1.id,
        )
        .unwrap();
        assert_eq!(0, count);

        //Test that invoice isn't found for invalid store id
        let oldest = invoice_1.created_datetime - chrono::Duration::milliseconds(50);
        let count =
            invoices_count(&repo, &item1_type, &status, oldest, None, invalid_store_id).unwrap();
        assert_eq!(0, count);
    }

    #[actix_rt::test]
    async fn test_invoice_count_service() {
        let (_, connection, _, _) = test_db::setup_all(
            "omsupply-database-invoice_count_service",
            MockDataInserts::all(),
        )
        .await;
        let ctx = ServiceContext::new_without_triggers(connection);
        let service = InvoiceCountService {};

        // There are two invoices created at these times for store_a:
        // 1) UTC 2021_12_7 20:30 -> NZ 2021_12_8 13:30
        // 2) UTC 2021_12_8 08:30 -> NZ 2021_12_8 21:30
        let store_id = "store_a";

        let nz_tz_offset = offset_to_timezone(&Some(13)).unwrap();
        // Create UTC date that is already one day later in NZ time, i.e. both event should be
        // captured
        let test_now = Utc.with_ymd_and_hms(2021, 12, 7, 15, 30, 0).unwrap();
        let today = service
            .invoices_count(
                &ctx,
                store_id,
                &InvoiceType::InboundShipment,
                &InvoiceStatus::New,
                &CountTimeRange::Today,
                &test_now,
                &nz_tz_offset,
            )
            .unwrap();
        assert_eq!(today, 2);
        let this_week = service
            .invoices_count(
                &ctx,
                store_id,
                &InvoiceType::InboundShipment,
                &InvoiceStatus::New,
                &CountTimeRange::ThisWeek,
                &test_now,
                &nz_tz_offset,
            )
            .unwrap();
        assert_eq!(this_week, 2);

        // Expect only one entry today in UTC tz
        let utc_offset = offset_to_timezone(&Some(0)).unwrap();
        let test_now = Utc.with_ymd_and_hms(2021, 12, 8, 15, 30, 0).unwrap();
        let today = service
            .invoices_count(
                &ctx,
                store_id,
                &InvoiceType::InboundShipment,
                &InvoiceStatus::New,
                &CountTimeRange::Today,
                &test_now,
                &utc_offset,
            )
            .unwrap();
        assert_eq!(today, 1);
        let this_week = service
            .invoices_count(
                &ctx,
                store_id,
                &InvoiceType::InboundShipment,
                &InvoiceStatus::New,
                &CountTimeRange::ThisWeek,
                &test_now,
                &utc_offset,
            )
            .unwrap();
        assert_eq!(this_week, 2);
    }
}
