"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("./util");
const logger_1 = require("./logger");
const node_fetch_1 = require("node-fetch");
const util_2 = require("./util");
const config_1 = require("./config");
const aws_sdk_1 = require("aws-sdk");
const slack_1 = require("./slack");
const mime_1 = require("./mime");
const s3 = new aws_sdk_1.S3({
    signatureVersion: 'v4',
    region: config_1.config.AWS_REGION,
});
exports.processMailObject = (url) => {
    logger_1.logger.info('Sending ' + url + ' to ' + config_1.config.SLACK_DEFAULT_HOOK_URL);
    return s3
        .getObject({ Bucket: util_2.urlToBucketName(url), Key: util_2.urlToKeyName(url) })
        .promise()
        .then(data => {
        logger_1.logger.info(`Got object ${url}, ${data.ContentLength} bytes`);
        return mime_1.parseMail(data.Body)
            .then(mail => {
            return slack_1.createMessage(mail).then(message => {
                return node_fetch_1.default(slack_1.findHookForChannel(message.channel), {
                    method: 'post',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        blocks: message.blocks,
                        text: message.text,
                    }),
                });
            });
        })
            .catch(err => {
            logger_1.logger.warn(`Failed to parse mail object: ${url}`, err);
            throw util_2.toThrow(err, `Failed to parse mail object: ${url}`);
        });
    })
        .catch(err => {
        logger_1.logger.warn(`Failed to get object: ${url}`, err);
        throw util_2.toThrow(err, `Failed to get object: ${url}`);
    });
};
exports.s3Handler = (event, context, callback) => {
    const payload = util_1.findPayload(event);
    try {
        const s3Event = payload;
        Promise.all(s3Event.Records.map(r => exports.processMailObject('s3://' + r.s3.bucket.name + '/' + r.s3.object.key)))
            .then(result => {
            logger_1.logger.info(`Got result: ${JSON.stringify(result, null, 2)}`);
            util_1.apiResponse(event, context, callback).success(result);
        })
            .catch(err => {
            logger_1.logger.warn('Failed to send to webhook URL', err);
            util_1.apiResponse(event, context, callback).failure('Failed to send to webhook URL: ' + err);
        });
    }
    catch (err) {
        logger_1.logger.warn('Failed to process s3 event', err);
        util_1.apiResponse(event, context, callback).failure('Failed to process s3 event: ' + err.message);
    }
};
//# sourceMappingURL=notify.js.map