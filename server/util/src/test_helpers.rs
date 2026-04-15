#[macro_export]
macro_rules! assert_matches {
    ($left:expr, $right:pat_param) => {{
        // Evaluate `$left` once to avoid flakiness and misleading error output when `$left` has
        // side effects (e.g. DB reads with concurrent writers).
        match $left {
            $right => {}
            other => panic!(
                "Unexpected match, \nexpected: {} \ngot: {:#?}",
                stringify!($right),
                other
            ),
        }
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
