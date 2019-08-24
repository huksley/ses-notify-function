# AWS SES Mail handler

## Intro

Notifications from different services (i.e. GitHub, LinkedIn, etc) have a different life-cycle than regular, person-to-person e-mails. It does not make sense for them to keep forever in your email client. 

Only the convenience of elastic gmail storage combined with autosorting them into "Forums" allowed this concept to become the norm.

But here is a proposed solution, to exclude them entirerly from your e-mail client.

## Tech

Setup your favorite social network, etc to send email to machine listening address.
Use logic to deliver cleaned up version of the email to your slack channel.
Save original message to S3 bucket for some period of time.

Listens to S3 bucket with MIME email message stored and sends notification to Slack.

## Flow

- Receive message
- Find sender, receiver, subject, text, etc
- Build short and expanded message
- Determine slack channel
- Find hook for channel
- Post message with buttons - (Short/Expand/Other channel)
- Recieve button press- Short - redisplay with short text
- Receive button press - Expand - redisplay with long text
- Receive button press - other channel - Remove from this channel, add to another channel, remember setting for this sender
