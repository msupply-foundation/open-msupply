use domain::location::UpdateLocation;
use repository::schema::LocationRow;

pub fn generate(
    UpdateLocation {
        id: _,
        code,
        name,
        on_hold,
    }: UpdateLocation,
    mut location_row: LocationRow,
) -> LocationRow {
    location_row.code = code.unwrap_or(location_row.code);
    location_row.name = name.unwrap_or(location_row.name);
    location_row.on_hold = on_hold.unwrap_or(location_row.on_hold);
    location_row
}
