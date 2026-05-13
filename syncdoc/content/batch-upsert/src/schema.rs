diesel::table! {
    users (id) {
        id -> Text,
        name -> Text,
        email -> Text,
        login_count -> Integer,
    }
}
