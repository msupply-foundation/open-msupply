#[macro_export]
macro_rules! assert_matches {
    ($left:expr, $right:pat_param) => {{
        assert!(
            matches!($left, $right),
            "Unexpected match, \nexpected: {} \ngot: {:#?}",
            stringify!($right),
            $left
        )
    }};
}

#[macro_export]
macro_rules! assert_variant {
    ($e:expr, $matches:pat => $result:expr) => {
         match $e {
            $matches=> $result,
            _ => panic!("expected {}", stringify!($matches:pat => $result:expr))
        }
    }
}
