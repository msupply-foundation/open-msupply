// Package reports holds the WS5 probe: running report convert_data JS transforms two ways —
// goja (pure-Go, no CGO) and Boa-over-CGO — to compare correctness and build/cross-compile cost.
package reports

import (
	"encoding/json"
	"fmt"

	"github.com/dop251/goja"
)

// RunConvertGoja runs a convert_data transform in the pure-Go goja engine (NO CGO).
// `varBundle` is the webpack `library.type: 'var'` build exposing a global `reportBundle`
// (goja has no ES-module support, so the ESM bundle Boa uses won't load here — that format
// difference is itself a finding). JSON in -> JSON out.
func RunConvertGoja(varBundle []byte, globalName, method string, inputJSON []byte) ([]byte, error) {
	vm := goja.New()
	if _, err := vm.RunString(string(varBundle)); err != nil {
		return nil, fmt.Errorf("goja load bundle: %w", err)
	}
	global := vm.Get(globalName)
	if global == nil || goja.IsUndefined(global) || goja.IsNull(global) {
		return nil, fmt.Errorf("bundle did not define global %q", globalName)
	}
	fn, ok := goja.AssertFunction(global.ToObject(vm).Get(method))
	if !ok {
		return nil, fmt.Errorf("export %q is not a function", method)
	}

	var input any
	if err := json.Unmarshal(inputJSON, &input); err != nil {
		return nil, fmt.Errorf("parse input: %w", err)
	}
	res, err := fn(goja.Undefined(), vm.ToValue(input))
	if err != nil {
		return nil, fmt.Errorf("goja convert_data: %w", err)
	}
	return json.Marshal(res.Export())
}
