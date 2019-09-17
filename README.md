# AWS SES Mail handler

[![Sponsored](https://img.shields.io/badge/chilicorn-sponsored-brightgreen.svg)](http://spiceprogram.org/oss-sponsorship)

## Intro

Notifications from different services (i.e. GitHub, LinkedIn, etc) have a different life-cycle than regular, person-to-person e-mails. It does not make sense for them to keep forever in your email client. 

Only the convenience of elastic gmail storage combined with autosorting them into "Forums" allowed this concept to become the norm.

But here is a proposed solution, to exclude them entirerly from your e-mail client.

## Tech

Setup your favorite social network, etc to send email to machine listening address.
Use logic to deliver cleaned up version of the email to your slack channel.
Save original message to S3 bucket for some period of time.

Listens to S3 bucket with MIME email message stored and sends notification to Slack.

You need manually configure your AWS account

## AWS requirements

- Custom domain
- Domain verified in AWS
- Custom domain MX records point at AWS
- Setup AWS SES receive hook to save to AWS S3 bucket
- Setup AWS Parameter Store with variables

## Flow

- Receive message
- Find sender, receiver, subject, text, etc
- Build structured and text message
- Determine slack channel
- Find hook for a channel
- Post to channel

