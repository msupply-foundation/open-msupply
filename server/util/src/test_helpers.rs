#[macro_export]
macro_rules! assert_matches {
    ($left:expr, $right:pat_param) => {{
        assert!(
            matches!($left, $right),
            "Unexpected match, expected: {} got: {:#?}",
            stringify!($right),
            $left
        )
    }};
}
