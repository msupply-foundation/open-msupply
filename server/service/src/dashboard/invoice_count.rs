use chrono::{
    DateTime, Datelike, FixedOffset, Local, NaiveDate, NaiveDateTime, TimeZone, Utc, Weekday,
};
use domain::invoice::InvoiceType;
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
    /// Arguments
    /// * now UTC DateTime that should be used for now (useful for testing)
    /// * timezone_offset offset in hours, if not specified the server local timezone is used
    fn invoice_count_created(
        &self,
        ctx: &ServiceContext,
        invoice_type: InvoiceType,
        now: DateTime<Utc>,
        timezone_offset: Option<i32>,
    ) -> Result<InvoiceCountCreated, InvoiceCountError>;
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

impl InvoiceCountServiceTrait for InvoiceCountService {
    fn invoice_count_created(
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

        let today =
            repo.created_invoices_count(invoice_type.clone(), start_of_today.naive_utc(), None)?;
        let this_week =
            repo.created_invoices_count(invoice_type, start_of_this_week.naive_utc(), None)?;
        Ok(InvoiceCountCreated { today, this_week })
    }
}

#[cfg(test)]
mod invoice_count_service_test {
    use repository::{mock::MockDataInserts, test_db};

    use super::*;

    #[actix_rt::test]
    async fn test_user_auth() {
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
            .invoice_count_created(
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
            .invoice_count_created(&ctx, InvoiceType::InboundShipment, test_now, Some(0))
            .unwrap();
        assert_eq!(result.today, 1);
        assert_eq!(result.this_week, 2);
    }
}
