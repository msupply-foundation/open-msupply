'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var globals = require('../utilities/globals');
var tslib = require('tslib');
var React = require('react');
var core$1 = require('../core');
var cache = require('../cache');
var context = require('../react/context');
var core = require('./core');
var optimism = require('optimism');

function _interopNamespace(e) {
    if (e && e.__esModule) return e;
    var n = Object.create(null);
    if (e) {
        for (var k in e) {
            n[k] = e[k];
        }
    }
    n["default"] = e;
    return Object.freeze(n);
}

var React__namespace = /*#__PURE__*/_interopNamespace(React);

var muteAllDeprecations = Symbol.for("apollo.deprecations");
var global = globals.global;
var slot = new optimism.Slot();
function isMuted(name) {
    return global[muteAllDeprecations] || (slot.getValue() || []).includes(name);
}
function muteDeprecations(name) {
    var args = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        args[_i - 1] = arguments[_i];
    }
    return slot.withValue.apply(slot, tslib.__spreadArray([Array.isArray(name) ? name : [name]], args, false));
}
function warnRemovedOption(options, name, callSite, recommendation) {
    if (recommendation === void 0) { recommendation = "Please remove this option."; }
    warnDeprecated(name, function () {
        if (name in options) {
            globalThis.__DEV__ !== false && globals.invariant.warn(104, callSite, name, recommendation);
        }
    });
}
function warnDeprecated(name, cb) {
    if (!isMuted(name)) {
        cb();
    }
}

var MockedProvider =  (function (_super) {
    tslib.__extends(MockedProvider, _super);
    function MockedProvider(props) {
        var _this = _super.call(this, props) || this;
        var _a = _this.props, mocks = _a.mocks, _b = _a.addTypename, addTypename = _b === void 0 ? true : _b, defaultOptions = _a.defaultOptions, cache$1 = _a.cache, resolvers = _a.resolvers, link = _a.link, showWarnings = _a.showWarnings, devtools = _a.devtools, _c = _a.connectToDevTools, connectToDevTools = _c === void 0 ? false : _c;
        if (globalThis.__DEV__ !== false) {
            warnRemovedOption(_this.props, "connectToDevTools", "MockedProvider", "Please use `devtools.enabled` instead.");
            warnRemovedOption(_this.props, "addTypename", "MockedProvider", "Please remove the `addTypename` prop. For best results, ensure the provided `mocks` include a `__typename` property on all mock objects to ensure the cache more closely behaves like production.");
        }
        var client = muteDeprecations(["connectToDevTools", "addTypename"], function () {
            return new core$1.ApolloClient({
                cache: cache$1 || new cache.InMemoryCache({ addTypename: addTypename }),
                defaultOptions: defaultOptions,
                devtools: devtools !== null && devtools !== void 0 ? devtools : {
                    enabled: connectToDevTools,
                },
                link: link || new core.MockLink(mocks || [], addTypename, { showWarnings: showWarnings }),
                resolvers: resolvers,
            });
        });
        _this.state = {
            client: client,
        };
        return _this;
    }
    MockedProvider.prototype.render = function () {
        var _a = this.props, children = _a.children, childProps = _a.childProps;
        var client = this.state.client;
        return React__namespace.isValidElement(children) ?
            React__namespace.createElement(context.ApolloProvider, { client: client }, React__namespace.cloneElement(React__namespace.Children.only(children), tslib.__assign({}, childProps)))
            : null;
    };
    MockedProvider.prototype.componentWillUnmount = function () {
        this.state.client.stop();
    };
    return MockedProvider;
}(React__namespace.Component));

exports.MockedProvider = MockedProvider;
for (var k in core) {
    if (k !== 'default' && !exports.hasOwnProperty(k)) exports[k] = core[k];
}
//# sourceMappingURL=testing.cjs.map
