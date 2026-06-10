package migrations

import (
	"fmt"
	"strconv"
	"strings"
)

// Version mirrors server/repository/src/migrations/version.rs.
// Semantics must match exactly so a DB migrated by Go records the same DatabaseVersion
// string and ordering decisions as the Rust server.
//
//   - parse: split on '.', take major/minor/patch; patch may carry a "-preRelease" suffix
//     (only the FIRST '-' splits, mirroring Rust's splitn(2, '-')).
//   - any unparseable numeric component becomes 0 (mirroring unwrap_or(0)).
//   - ordering compares major, then minor, then patch; pre-release is IGNORED.
//   - equality compares major/minor/patch only.
type Version struct {
	Major      int
	Minor      int
	Patch      int
	PreRelease string // "" when absent; never participates in compare/equality
}

// ParseVersion mirrors Version::from_str.
func ParseVersion(s string) Version {
	parts := strings.Split(s, ".")
	get := func(i int) string {
		if i < len(parts) {
			return parts[i]
		}
		return "0"
	}
	major := get(0)
	minor := get(1)
	patchAndExtra := get(2)

	// splitn(2, '-'): only the first dash separates patch from the pre-release tag.
	patch := patchAndExtra
	pre := ""
	if idx := strings.IndexByte(patchAndExtra, '-'); idx >= 0 {
		patch = patchAndExtra[:idx]
		pre = patchAndExtra[idx+1:]
	}

	return Version{
		Major:      atoiOr0(major),
		Minor:      atoiOr0(minor),
		Patch:      atoiOr0(patch),
		PreRelease: pre,
	}
}

func atoiOr0(s string) int {
	// Rust parses to i16 with unwrap_or(0). A leading-/trailing-garbage string fails to
	// parse and becomes 0 (e.g. "11b" -> 0, "99RC1" -> 0).
	n, err := strconv.ParseInt(s, 10, 16)
	if err != nil {
		return 0
	}
	return int(n)
}

func (v Version) String() string {
	if v.PreRelease != "" {
		return fmt.Sprintf("%d.%d.%d-%s", v.Major, v.Minor, v.Patch, v.PreRelease)
	}
	return fmt.Sprintf("%d.%d.%d", v.Major, v.Minor, v.Patch)
}

// Cmp returns -1, 0, +1 (pre-release ignored), mirroring Rust's Ord.
func (v Version) Cmp(o Version) int {
	if v.Major != o.Major {
		return sign(v.Major - o.Major)
	}
	if v.Minor != o.Minor {
		return sign(v.Minor - o.Minor)
	}
	if v.Patch != o.Patch {
		return sign(v.Patch - o.Patch)
	}
	return 0
}

func (v Version) Less(o Version) bool    { return v.Cmp(o) < 0 }
func (v Version) Greater(o Version) bool { return v.Cmp(o) > 0 }
func (v Version) Equal(o Version) bool   { return v.Cmp(o) == 0 }

func sign(n int) int {
	switch {
	case n < 0:
		return -1
	case n > 0:
		return 1
	default:
		return 0
	}
}

