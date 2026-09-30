# App review

Helixa requests only the permissions below. Each file has the product use case and a screencast script. Do not request Instagram content publishing or TikTok `video.publish`.

## Instagram Login

- [instagram_business_basic](instagram_business_basic.md)
- [instagram_business_manage_messages](instagram_business_manage_messages.md)
- [instagram_business_manage_comments](instagram_business_manage_comments.md)

## Facebook Login

`pages_show_list`, `pages_messaging`, `pages_manage_metadata`, and `pages_read_engagement` are always requested. `business_management` is requested only when the operator checks the box on Connected Platforms.

- [pages_show_list](pages_show_list.md)
- [pages_messaging](pages_messaging.md)
- [pages_manage_metadata](pages_manage_metadata.md)
- [pages_read_engagement](pages_read_engagement.md)
- [business_management](business_management.md)

## WhatsApp

- [whatsapp_business_messaging](whatsapp_business_messaging.md)
- [whatsapp_business_management](whatsapp_business_management.md)

## TikTok Business Messaging

- [user.info.basic](tiktok_user.info.basic.md)
- [user.info.username](tiktok_user.info.username.md)
- [user.info.profile](tiktok_user.info.profile.md)
- [user.account.type](tiktok_user.account.type.md)
- [message.list.read](tiktok_message.list.read.md)
- [message.list.send](tiktok_message.list.send.md)
- [message.list.manage](tiktok_message.list.manage.md)
- [comment.list](tiktok_comment.list.md)

### TikTok access path

For Egypt and the GCC, apply without the United States so approval is not held for the US data security review.

1. Create the developer app. Include Ad Account Management, CTX Events Management, and Measurement if the form asks for them on a new app.
2. Accounts API access form: https://bytedance.sg.larkoffice.com/share/base/form/shrlgu4WEvtSXpEDLcCw56u4Rfc
3. Business Messaging review: https://bytedance.sg.larkoffice.com/share/base/form/shrlg7vFArGhg9V20neYCEwIKrb

Turn on `TIKTOK_MESSAGING_ENABLED` after that review. Set `TIKTOK_US_REVIEW_APPROVED` only after the separate US review. Details are in [phase 4](../phase4-channels.md).

Public URLs for the Meta form are in [DEPLOY.md](../DEPLOY.md): `/privacy`, `/terms`, `/data-deletion`, `/api/meta/data-deletion`, and `/api/meta/deauthorize`.
