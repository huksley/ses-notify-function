"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv");
const R = require("ramda");
require("source-map-support/register");
exports.defaultConfig = {
    NODE_ENV: 'development',
    LOG_LEVEL: 'info',
    AWS_REGION: 'eu-west-1',
    SLACK_DEFAULT_HOOK_URL: 'https://hooks.slack.com/services/DEADBEEF/DEADBEEF/beefdeaddeadbeefdead',
    TEST_E2E: false,
    TEST_E2E_OBJECT: 's3://sample-bucket/sample-folder/deadbeefdeadbeefdeaddeadbeef',
};
const toBoolean = (o, k) => {
    const oo = o;
    for (const kk of k) {
        oo[kk] = typeof o[kk] === 'string' ? Boolean(o[kk]) : o[kk];
    }
    return o;
};
const toNumber = (o, k) => {
    const oo = o;
    for (const kk of k) {
        oo[kk] = typeof o[kk] === 'string' ? Number(o[kk]) : o[kk];
    }
    return o;
};
exports.config = toNumber(toBoolean(Object.assign({}, exports.defaultConfig, (dotenv.config().parsed || R.pick(R.keys(exports.defaultConfig), process.env))), ['TEST_E2E']), []);
//# sourceMappingURL=config.js.map