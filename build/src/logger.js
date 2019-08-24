"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const winston = require("winston");
const config_1 = require("./config");
winston.configure({
    level: config_1.config.LOG_LEVEL,
    transports: [new winston.transports.Console({})],
});
exports.logger = winston;
//# sourceMappingURL=logger.js.map