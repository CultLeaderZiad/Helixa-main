# pages_manage_metadata

## Use case
Subscribe the connected Page to the Cyreax DM webhook so new messages and comments arrive without polling. The subscription is created when the Page is connected and removed when the customer disconnects. Cyreax DM does not edit the Page name, about text, or settings outside that subscription.

## Screencast
1. Connect a Page from Connected Platforms.
2. In the Meta webhook logs, or in Cyreax DM's inbound events if you have database access, show a message event arriving after the subscription.
3. Disconnect the Page in Cyreax DM.
4. Show that a new message no longer creates a thread until the Page is connected again.
