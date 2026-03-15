import { __assign, __extends, __rest } from "tslib";
import * as React from "rehackt";
import hoistNonReactStatics from "hoist-non-react-statics";
import { parser } from "../parser/index.js";
import { Query } from "../components/index.js";
import { getDisplayName, GraphQLBase, calculateVariablesFromProps, defaultMapPropsToOptions, defaultMapPropsToSkip, } from "./hoc-utils.js";
import invariant from "ts-invariant";
import { muteDeprecations, warnDeprecated, } from "../../utilities/deprecation/index.js";
/**
 * @deprecated
 * Official support for React Apollo higher order components ended in March 2020.
 * This library is still included in the `@apollo/client` package, but it no longer receives feature updates or bug fixes.
 */
export function withQuery(document, operationOptions) {
    if (operationOptions === void 0) { operationOptions = {}; }
    if (globalThis.__DEV__ !== false) {
        warnDeprecated("withQuery", function () {
            globalThis.__DEV__ !== false && invariant.warn(75);
        });
    }
    // this is memoized so if coming from `graphql` there is nearly no extra cost
    var operation = muteDeprecations("parser", parser, [document]);
    // extract options
    var _a = operationOptions.options, options = _a === void 0 ? defaultMapPropsToOptions : _a, _b = operationOptions.skip, skip = _b === void 0 ? defaultMapPropsToSkip : _b, _c = operationOptions.alias, alias = _c === void 0 ? "Apollo" : _c;
    var mapPropsToOptions = options;
    if (typeof mapPropsToOptions !== "function") {
        mapPropsToOptions = function () { return options; };
    }
    var mapPropsToSkip = skip;
    if (typeof mapPropsToSkip !== "function") {
        mapPropsToSkip = function () { return skip; };
    }
    // allow for advanced referential equality checks
    var lastResultProps;
    return function (WrappedComponent) {
        var graphQLDisplayName = "".concat(alias, "(").concat(getDisplayName(WrappedComponent), ")");
        var GraphQL = /** @class */ (function (_super) {
            __extends(GraphQL, _super);
            function GraphQL() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            GraphQL.prototype.render = function () {
                var _this = this;
                var props = this.props;
                var shouldSkip = mapPropsToSkip(props);
                var opts = shouldSkip ? Object.create(null) : __assign({}, mapPropsToOptions(props));
                if (!shouldSkip && !opts.variables && operation.variables.length > 0) {
                    opts.variables = calculateVariablesFromProps(operation, props);
                }
                return (React.createElement(Query, __assign({}, opts, { displayName: graphQLDisplayName, skip: shouldSkip, query: document }), function (_a) {
                    var _b, _c;
                    var _ = _a.client, data = _a.data, r = __rest(_a, ["client", "data"]);
                    if (operationOptions.withRef) {
                        _this.withRef = true;
                        props = Object.assign({}, props, {
                            ref: _this.setWrappedInstance,
                        });
                    }
                    // if we have skipped, no reason to manage any reshaping
                    if (shouldSkip) {
                        return (React.createElement(WrappedComponent, __assign({}, props, {})));
                    }
                    // the HOC's historically hoisted the data from the execution result
                    // up onto the result since it was passed as a nested prop
                    // we massage the Query components shape here to replicate that
                    var result = Object.assign(r, data || {});
                    var name = operationOptions.name || "data";
                    var childProps = (_b = {}, _b[name] = result, _b);
                    if (operationOptions.props) {
                        var newResult = (_c = {},
                            _c[name] = result,
                            _c.ownProps = props,
                            _c);
                        lastResultProps = operationOptions.props(newResult, lastResultProps);
                        childProps = lastResultProps;
                    }
                    return (React.createElement(WrappedComponent, __assign({}, props, childProps)));
                }));
            };
            GraphQL.displayName = graphQLDisplayName;
            GraphQL.WrappedComponent = WrappedComponent;
            return GraphQL;
        }(GraphQLBase));
        // Make sure we preserve any custom statics on the original component.
        return hoistNonReactStatics(GraphQL, WrappedComponent, {});
    };
}
//# sourceMappingURL=query-hoc.js.map