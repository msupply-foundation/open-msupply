const { TestEnvironment } = require('jest-environment-jsdom');

// Runs a test file in a timezone, as convert_data runs in the report's. jest.config.js runs every
// file in each of its timezones; a file that needs one in particular names it in its docblock:
//
//   /**
//    * @jest-environment ./jest-timezone-environment.js
//    * @jest-environment-options {"timezone": "Pacific/Pago_Pago"}
//    */
class TimezoneEnvironment extends TestEnvironment {
  constructor(config, context) {
    super(config, context);
    this.timezone = config.projectConfig.testEnvironmentOptions.timezone;
  }

  async setup() {
    await super.setup();
    this.previousTimezone = process.env.TZ;
    process.env.TZ = this.timezone;
  }

  async teardown() {
    process.env.TZ = this.previousTimezone;
    await super.teardown();
  }
}

module.exports = TimezoneEnvironment;
