const { TestEnvironment } = require('jest-environment-jsdom');

// Runs a test file in the timezone its docblock names, as convert_data runs in the report's:
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
