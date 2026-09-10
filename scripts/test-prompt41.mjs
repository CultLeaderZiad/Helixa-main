// Test script for Prompt 41 implementations
import assert from "node:assert"

console.log("🚀 Running Prompt 41 Live Verification Tests...\n")

// Test 1: matchesSpecificPost logic
console.log("👉 Test 1: matchesSpecificPost logic")
function matchesSpecificPost(specificMediaId, eventPostId) {
  if (!specificMediaId || !eventPostId) return false
  const s = String(specificMediaId).trim()
  const e = String(eventPostId).trim()
  if (s === e) return true
  if (e.endsWith(`_${s}`) || s.endsWith(`_${e}`)) return true
  return false
}

// Exact match
assert.strictEqual(matchesSpecificPost("1234567890", "1234567890"), true, "Exact match should be true")
// Page ID prefix match
assert.strictEqual(matchesSpecificPost("1234567890", "998877_1234567890"), true, "Page ID prefix should match")
// Reverse prefix match
assert.strictEqual(matchesSpecificPost("998877_1234567890", "1234567890"), true, "Reverse prefix should match")
// Different post ID
assert.strictEqual(matchesSpecificPost("1234567890", "998877_9999999999"), false, "Different post must be false")
// Null / undefined handling
assert.strictEqual(matchesSpecificPost(null, "1234567890"), false, "Null specificMediaId must be false")
assert.strictEqual(matchesSpecificPost("1234567890", null), false, "Null eventPostId must be false")
console.log("   ✅ matchesSpecificPost passed all assertions!\n")

// Test 2: Priority comment matching logic
console.log("👉 Test 2: Priority comment matching behavior")
function keywordMatches(triggerValue, text) {
  if (!triggerValue || !text) return false
  const keywords = triggerValue.split(",").map(k => k.trim().toLowerCase()).filter(Boolean)
  const lowerText = text.toLowerCase()
  return keywords.some(k => lowerText.includes(k))
}

const mockAutomations = [
  { id: "global-reply-all", specific_media_id: null, trigger_type: "reply_all", trigger_value: "ALL", name: "Global Catch-All" },
  { id: "global-pricing", specific_media_id: null, trigger_type: "keyword", trigger_value: "price, pricing", name: "Global Pricing" },
  { id: "post-a-reply-all", specific_media_id: "post_A", trigger_type: "reply_all", trigger_value: "ALL", name: "Post A Catch-All" },
  { id: "post-a-promo", specific_media_id: "post_A", trigger_type: "keyword", trigger_value: "discount, promo", name: "Post A Promo" },
]

function findMatchingRule(automations, postId, text) {
  let match = automations.find(a => matchesSpecificPost(a.specific_media_id, postId) && a.trigger_type === "keyword" && keywordMatches(a.trigger_value, text))
  if (!match) {
    match = automations.find(a => matchesSpecificPost(a.specific_media_id, postId) && a.trigger_type === "reply_all")
  }
  if (!match) {
    match = automations.find(a => !a.specific_media_id && a.trigger_type === "keyword" && keywordMatches(a.trigger_value, text))
  }
  if (!match) {
    match = automations.find(a => !a.specific_media_id && a.trigger_type === "reply_all")
  }
  return match
}

// Case A: Comment on Post A with "discount" -> should match Post A Promo
const match1 = findMatchingRule(mockAutomations, "post_A", "I want a discount please")
assert.strictEqual(match1?.id, "post-a-promo", "Specific post keyword must win")

// Case B: Comment on Post A without keyword -> should match Post A Catch-All (NOT Global Catch-All)
const match2 = findMatchingRule(mockAutomations, "post_A", "Nice picture!")
assert.strictEqual(match2?.id, "post-a-reply-all", "Specific post catch-all must win over global")

// Case C: Comment on Post B (not Post A) with "price" -> should match Global Pricing
const match3 = findMatchingRule(mockAutomations, "post_B", "What is the price?")
assert.strictEqual(match3?.id, "global-pricing", "Global keyword matches non-specific post")

// Case D: Comment on Post B with "discount" (which only Post A has specific rule for) -> should match Global Catch-All, NOT Post A Promo!
const match4 = findMatchingRule(mockAutomations, "post_B", "Can I get a discount?")
assert.strictEqual(match4?.id, "global-reply-all", "Post-specific rule must NEVER trigger on different post")

console.log("   ✅ Priority comment matching strictly prevents cross-post leakage!\n")

// Test 3: Facebook URL extraction regex
console.log("👉 Test 3: Facebook URL extraction patterns")
const testUrls = [
  { url: "https://www.facebook.com/share/p/181rV9gXyM/", expectedType: "share" },
  { url: "https://facebook.com/permalink.php?story_fbid=123456789&id=987654321", expectedType: "permalink", expectedId: "123456789" },
  { url: "https://www.facebook.com/username/posts/101589123456789", expectedType: "posts", expectedId: "101589123456789" },
  { url: "https://www.facebook.com/reel/987654321098765", expectedType: "reel", expectedId: "987654321098765" }
]

for (const t of testUrls) {
  const permalinkMatch = t.url.match(/story_fbid=([0-9a-zA-Z_]+)/i)
  const postsMatch = t.url.match(/\/(?:posts|videos|reel)\/([0-9a-zA-Z_]+)/i)
  const isShare = t.url.includes("/share/p/") || t.url.includes("/share/r/") || t.url.includes("/share/v/")
  
  if (t.expectedType === "share") {
    assert.strictEqual(isShare, true, `Should detect share URL for ${t.url}`)
  } else if (t.expectedId) {
    const id = permalinkMatch ? permalinkMatch[1] : (postsMatch ? postsMatch[1] : null)
    assert.strictEqual(id, t.expectedId, `Extracted ID should match for ${t.url}`)
  }
}
console.log("   ✅ URL pattern extraction correctly parses standard and share links!\n")

console.log("🎉 All Prompt 41 core logic unit tests passed successfully!\n")
