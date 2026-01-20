
  cordova.define('cordova/plugin_list', function(require, exports, module) {
    module.exports = [
      {
          "id": "cordova-honeywell-plugin.HoneywellScannerPlugin",
          "file": "plugins/cordova-honeywell-plugin/www/honeywell.js",
          "pluginId": "cordova-honeywell-plugin",
        "clobbers": [
          "plugins.honeywell"
        ]
        }
    ];
    module.exports.metadata =
    // TOP OF METADATA
    {
      "cordova-honeywell-plugin": "0.1.0"
    };
    // BOTTOM OF METADATA
    });
    