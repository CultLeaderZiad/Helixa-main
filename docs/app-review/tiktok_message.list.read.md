# message.list.read

## Use case
Receive TikTok Business Messaging DMs into the Helixa inbox. The webhook creates a contact and a thread. Helixa does not read messages for an account that has not been connected, and the feature stays off until `TIKTOK_MESSAGING_ENABLED=true`.

## Screencast
1. From a second TikTok account, send a DM to the connected business account.
2. Open the Helixa inbox and show the incoming message.
3. Show the webhook delivery or the thread timestamp.
4. Do not export the conversation.
