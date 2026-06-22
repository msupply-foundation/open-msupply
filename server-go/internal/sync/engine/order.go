// Package engine is the pull (translate + integrate) and push (translate-to-sync) core of the
// Go sync system. It mirrors server/service/src/sync/translation_and_integration.rs and the
// push loop in translations/mod.rs. Translators are passed in (see translations.AllTranslators)
// so the engine stays decoupled from the concrete translator set.
package engine

import (
	"fmt"
	"sort"

	"github.com/msupply-foundation/open-msupply/server-go/internal/sync/synctypes"
)

// PullIntegrationOrder returns the legacy table names ordered so that dependencies precede
// their dependents (for upserts; deletes use the reverse). Mirrors pull_integration_order
// (translations/mod.rs) but uses Kahn's algorithm — popping each round's zero-indegree nodes
// in alphabetical order for determinism. Any valid topological order integrates correctly, so
// callers/tests should assert the dependency invariant, not an exact sequence.
func PullIntegrationOrder(translators []synctypes.SyncTranslation) ([]string, error) {
	nodes := map[string]bool{}
	indeg := map[string]int{}
	succ := map[string]map[string]bool{} // dep -> set of dependents

	add := func(n string) {
		nodes[n] = true
		if _, ok := indeg[n]; !ok {
			indeg[n] = 0
		}
	}

	for _, t := range translators {
		tables := t.TableNames()
		for _, tn := range tables {
			add(tn)
		}
		for _, dep := range t.PullDependencies() {
			add(dep)
			for _, tn := range tables {
				if succ[dep] == nil {
					succ[dep] = map[string]bool{}
				}
				if !succ[dep][tn] {
					succ[dep][tn] = true
					indeg[tn]++
				}
			}
		}
	}

	var out []string
	processed := map[string]bool{}
	for len(out) < len(nodes) {
		var batch []string
		for n := range nodes {
			if !processed[n] && indeg[n] == 0 {
				batch = append(batch, n)
			}
		}
		if len(batch) == 0 {
			return nil, fmt.Errorf("circular dependencies in pull integration order")
		}
		sort.Strings(batch)
		for _, n := range batch {
			processed[n] = true
			out = append(out, n)
			for s := range succ[n] {
				indeg[s]--
			}
		}
	}
	return out, nil
}
