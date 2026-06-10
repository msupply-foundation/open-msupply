package migrations

import "testing"

// These cases are ported VERBATIM from server/repository/src/migrations/version.rs tests,
// to confirm the Go port reproduces Rust's parsing/ordering behavior exactly.

func TestParsingVersion(t *testing.T) {
	cases := []struct {
		in   string
		want Version
	}{
		{"10.11.99", Version{10, 11, 99, ""}},
		{"1.2.3-RC1", Version{1, 2, 3, "RC1"}},
		{"3.2.1-TEST-IT_1", Version{3, 2, 1, "TEST-IT_1"}}, // only first '-' splits
	}
	for _, c := range cases {
		got := ParseVersion(c.in)
		if got != c.want {
			t.Errorf("ParseVersion(%q) = %+v, want %+v", c.in, got, c.want)
		}
	}
}

func TestParsingVersionPoorlyFormatted(t *testing.T) {
	// "10.11" -> 10.11.0
	if v := ParseVersion("10.11"); v.Major != 10 || v.Minor != 11 || v.Patch != 0 {
		t.Errorf(`ParseVersion("10.11") = %+v`, v)
	}
	// "10.11.99RC1" -> 10.11.0  (99RC1 fails to parse)
	if v := ParseVersion("10.11.99RC1"); v.Major != 10 || v.Minor != 11 || v.Patch != 0 {
		t.Errorf(`ParseVersion("10.11.99RC1") = %+v`, v)
	}
	// "10.11b.99" -> 10.0.99  (11b fails to parse)
	if v := ParseVersion("10.11b.99"); v.Major != 10 || v.Minor != 0 || v.Patch != 99 {
		t.Errorf(`ParseVersion("10.11b.99") = %+v`, v)
	}
}

func TestComparingVersions(t *testing.T) {
	if !ParseVersion("10.11.01").Greater(ParseVersion("01.11.2")) {
		t.Error("10.11.01 should be > 01.11.2")
	}
	if !ParseVersion("12.10.03").Less(ParseVersion("12.11.02")) {
		t.Error("12.10.03 should be < 12.11.02")
	}
	if !ParseVersion("10.11.01").Less(ParseVersion("10.11.2")) {
		t.Error("10.11.01 should be < 10.11.2")
	}
	// pre-release is ignored in equality
	if !ParseVersion("10.11.01-RC1").Equal(ParseVersion("10.11.1-RC2")) {
		t.Error("10.11.01-RC1 should equal 10.11.1-RC2")
	}
}
