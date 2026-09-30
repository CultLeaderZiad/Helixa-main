/**
 * Single Meta Graph API version for Facebook, Instagram, WhatsApp, and the JS SDK.
 *
 * v20.0 was removed on 2026-09-24. v25.0 is supported until 2028-07-29.
 * v26.0 exists, but this app stays on v25.0 because that is the version the
 * Facebook routes were already verified against.
 * https://developers.facebook.com/docs/graph-api/changelog/
 */
export const GRAPH_API_VERSION = "v25.0"

export const FACEBOOK_GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`
export const INSTAGRAM_GRAPH_BASE = `https://graph.instagram.com/${GRAPH_API_VERSION}`
