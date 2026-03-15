import { __assign, __extends } from "tslib";
import * as React from "react";
import { ApolloClient } from "../../core/index.js";
import { InMemoryCache as Cache } from "../../cache/index.js";
import { ApolloProvider } from "../../react/context/index.js";
import { MockLink } from "../core/index.js";
import { warnRemovedOption, muteDeprecations, } from "../../utilities/deprecation/index.js";
var MockedProvider = /** @class */ (function (_super) {
    __extends(MockedProvider, _super);
    function MockedProvider(props) {
        var _this = _super.call(this, props) || this;
        var _a = _this.props, mocks = _a.mocks, _b = _a.addTypename, addTypename = _b === void 0 ? true : _b, defaultOptions = _a.defaultOptions, cache = _a.cache, resolvers = _a.resolvers, link = _a.link, showWarnings = _a.showWarnings, devtools = _a.devtools, _c = _a.connectToDevTools, connectToDevTools = _c === void 0 ? false : _c;
        if (globalThis.__DEV__ !== false) {
            warnRemovedOption(_this.props, "connectToDevTools", "MockedProvider", "Please use `devtools.enabled` instead.");
            warnRemovedOption(_this.props, "addTypename", "MockedProvider", "Please remove the `addTypename` prop. For best results, ensure the provided `mocks` include a `__typename` property on all mock objects to ensure the cache more closely behaves like production.");
        }
        var client = muteDeprecations(["connectToDevTools", "addTypename"], function () {
            return new ApolloClient({
                cache: cache || new Cache({ addTypename: addTypename }),
                defaultOptions: defaultOptions,
                devtools: devtools !== null && devtools !== void 0 ? devtools : {
                    enabled: connectToDevTools,
                },
                link: link || new MockLink(mocks || [], addTypename, { showWarnings: showWarnings }),
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
        return React.isValidElement(children) ?
            React.createElement(ApolloProvider, { client: client }, React.cloneElement(React.Children.only(children), __assign({}, childProps)))
            : null;
    };
    MockedProvider.prototype.componentWillUnmount = function () {
        // Since this.state.client was created in the constructor, it's this
        // MockedProvider's responsibility to terminate it.
        this.state.client.stop();
    };
    return MockedProvider;
}(React.Component));
export { MockedProvider };
//# sourceMappingURL=MockedProvider.js.map