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

/// Compare two f64 values for approximate equality using a relative tolerance.
/// Uses a minimum absolute tolerance of 1e-8 to handle values near zero,
/// scaled by the magnitude of the larger operand for large values.
pub fn f64_approx_eq(a: f64, b: f64) -> bool {
    let tolerance = f64::EPSILON * a.abs().max(b.abs()) * 10.0;
    (a - b).abs() <= tolerance.max(1e-8)
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

    #[test]
    fn test_f64_approx_eq() {
        // Identical values
        assert!(f64_approx_eq(1.0, 1.0));
        assert!(f64_approx_eq(0.0, 0.0));

        // Clearly different values
        assert!(!f64_approx_eq(1.0, 2.0));
        assert!(!f64_approx_eq(100.0, 100.01));

        // Large values: difference within relative tolerance should be equal
        let large = 1_000_000.0;
        let drift = f64::EPSILON * large * 5.0;
        assert!(f64_approx_eq(large, large + drift));

        // Large values: meaningful difference should not be equal
        assert!(!f64_approx_eq(large, large + 0.01));

        // Near zero: uses minimum absolute tolerance of 1e-8
        assert!(f64_approx_eq(0.0, 1e-9));
        assert!(!f64_approx_eq(0.0, 1e-7));
    }
}
