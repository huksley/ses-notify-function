"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require("uuid/v4");
const config_1 = require("./config");
exports.findHookForChannel = channel => {
    return channel === undefined ? config_1.config.SLACK_DEFAULT_HOOK_URL : '?';
};
exports.createMessage = (mail) => {
    const blocks = [
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*From:* ${mail.from && mail.from.text} \n*To:* ${mail.to && mail.to.text} \n${mail.subject}\n`,
            },
        },
        {
            type: 'divider',
        },
        {
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: mail.text,
            },
        },
        {
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `Received: ${mail.date}`,
                },
            ],
        },
    ];
    const text = `${mail.subject}, ${mail.from && mail.from.text}, ${mail.to &&
        mail.to.text}, ${mail.cc && mail.cc.text}, ${mail.bcc && mail.bcc.text}\n\n
    --
  ${mail.text}  
  `;
    const message = {
        uuid: uuid(),
        blocks,
        text,
        channel: undefined,
    };
    return Promise.resolve(message);
};
//# sourceMappingURL=slack.js.map