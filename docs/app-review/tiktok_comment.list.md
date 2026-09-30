# comment.list

## Use case

Read new comments on the connected TikTok Business Account through the `comment.update` webhook. Helixa matches the creator's keyword and posts one public reply, such as "Check your DMs" or "DM us PRICE", with `POST /business/comment/reply/create/`. The commenter is saved as a lead.

This scope is not used to DM an arbitrary commenter. Comment-to-Message stays a separate Business Messaging feature and only runs for high-intent comments on accounts registered in Vietnam, Indonesia, or Thailand.

## Screencast

1. Show the TikTok app permissions and point at `comment.list`.
2. Comment a keyword on a video from a second account.
3. Show the public reply on that comment and the new lead in Helixa.
4. Show that the TikTok thread for that commenter did not receive a DM.
