# whatsapp_business_messaging

## Use case
Send and receive WhatsApp messages for the phone number the business connected. Session messages go out inside the open customer-care window. Outside that window Helixa sends only a template whose status is `approved`, and a broadcast requires the contact's `opted_in` flag. The inbox shows the thread next to Instagram and Messenger.

## Screencast
1. Connect a WhatsApp number (Embedded Signup, or a phone number id plus system-user token).
2. From a handset, send "hello" to that business number.
3. Open the Helixa inbox and show the WhatsApp thread.
4. Reply from Helixa and show the message on the handset.
5. Show a template step only if you have an approved template. Do not send a marketing message to a number that has not opted in.
