pub mod temperature_chart;
pub mod temperature_chart_row;
pub use self::temperature_chart::*;
pub use self::temperature_chart_row::*;

table!(
  time_series(from_datetime) {
      from_datetime -> Timestamp,
      to_datetime -> Timestamp,
  }
);
