"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const logger_1 = require("./logger");
const PathReporter_1 = require("io-ts/lib/PathReporter");
const url_1 = require("url");
const R = require("ramda");
exports.urlToBucketName = (s3Url) => {
    const u = new url_1.URL(s3Url);
    if (u.protocol === 's3:') {
        return u.host;
    }
    else if (u.protocol === 'https:') {
        const p = u.pathname.substring(1).split('/');
        assert.ok(p && p.length > 0);
        return p[0];
    }
    else {
        throw new Error('Unsupported protocol: ' + s3Url);
    }
};
exports.urlToKeyName = (s3Url) => {
    const u = new url_1.URL(s3Url);
    if (u.protocol === 's3:') {
        return u.pathname.substring(1);
    }
    else if (u.protocol === 'https:') {
        const p = u.pathname.substring(1).split('/');
        assert.ok(p && p.length > 0);
        p.splice(0, 1);
        return p.join('/');
    }
    else {
        throw new Error('Unsupported protocol: ' + s3Url);
    }
};
exports.passert = (value, result) => {
    assert.ok(value);
    return result;
};
exports.plog = (msg, meta, result) => {
    logger_1.logger.info(msg, JSON.stringify(meta));
    return result;
};
exports.decode = (type, json) => {
    assert.ok(json, 'Incoming JSON is either a string or an object: ' + json);
    const res = type.decode(typeof json === 'string' ? JSON.parse(json) : json);
    const value = res.getOrElseL(_ => {
        throw new Error('Invalid value ' + JSON.stringify(PathReporter_1.PathReporter.report(res)));
    });
    return R.pick(R.filter(k => value[k] !== undefined, R.keys(value)), value);
};
exports.toThrow = (err, msg) => new Error(err && err && err.message && err.message + (msg && ' ' + msg));
exports.noext = (path) => {
    return path.substring(0, path.lastIndexOf('.'));
};
exports.ext = (path) => {
    return path.substring(path.lastIndexOf('.') + 1);
};
exports.findPayload = (event) => {
    const simplePayload = event.body === undefined;
    const payload = simplePayload ? event : event.body;
    return payload;
};
exports.apiResponse = (event, context, callback) => {
    const simplePayload = event.body === undefined;
    const cb = simplePayload
        ? (_, response) => {
            logger_1.logger.info(`Response function ${context.functionName}, requestId = ${context.awsRequestId}, status ${response.statusCode}`);
            return callback(null, JSON.parse(response.body));
        }
        : (_, response) => {
            logger_1.logger.info(`Response function ${context.functionName}, requestId = ${context.awsRequestId}, status ${response.statusCode}`);
            return callback(null, response);
        };
    return {
        success: (payload, statusCode = 200, headers = undefined) => {
            context.callbackWaitsForEmptyEventLoop = false;
            return cb(null, {
                statusCode,
                headers: Object.assign({}, headers, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': true }),
                body: JSON.stringify(payload),
            });
        },
        failure: (payload = undefined, statusCode = 500, headers = undefined) => {
            context.callbackWaitsForEmptyEventLoop = false;
            return cb(null, {
                statusCode,
                headers: Object.assign({}, headers, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Credentials': true }),
                body: typeof payload === 'string'
                    ? JSON.stringify({ message: payload })
                    : JSON.stringify(payload || { message: 'Internal server error' }),
            });
        },
    };
};
//# sourceMappingURL=util.js.map