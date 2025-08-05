pub fn fraction_is_integer(fraction: f64) -> bool {
    fraction.fract() == 0.0
}

pub fn pos_zero(value: f64) -> f64 {
    // This would make -0.0 = positive 0.0
    if value == 0.0 {
        0.0
    } else {
        value
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pos_zero() {
        let value = -0.0;

        assert_eq!(format!("{value}"), "-0");
        assert_eq!(format!("{}", pos_zero(value)), "0");
    }
}
