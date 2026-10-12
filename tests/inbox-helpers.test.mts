import test from 'node:test'
import assert from 'node:assert/strict'
import { displayName } from '../lib/ui/contactName.ts'
import { describeEvent, formatMessagePreview, getWindowCountdown } from '../lib/ui/eventLabels.ts'

test('contact display name formatting', async (t) => {
  await t.test('prefers explicit display name when present', () => {
    assert.equal(displayName({ display_name: 'Mariam Khaled', recipient_username: 'mariam.k' }), 'Mariam Khaled')
    assert.equal(displayName({ name: 'Ahmed Hassan' }), 'Ahmed Hassan')
  })

  await t.test('uses social username if no display name is present', () => {
    assert.equal(displayName({ recipient_username: 'nick_saraev' }), 'nick_saraev')
    assert.equal(displayName({ username: '@sara.alotaibi' }), '@sara.alotaibi')
  })

  await t.test('never leaks raw database ID cnt_ or UUID', () => {
    // raw cnt_ ID fallback
    assert.equal(
      displayName({ recipient_username: 'cnt_31206', recipient_id: '31206', platform: 'instagram' }),
      'Instagram user · 31206'
    )
    // UUID fallback
    assert.equal(
      displayName({ display_name: 'f47ac10b-58cc-4372-a567-0e02b2c3d479', platform: 'whatsapp' }),
      'WhatsApp user · 3d479'
    )
    // String input fallback
    assert.equal(displayName('cnt_998812345'), 'User · 12345')
  })

  await t.test('supports Arabic channel user fallback', () => {
    assert.equal(
      displayName({ recipient_username: 'cnt_31206', platform: 'instagram' }, 'ar'),
      'مستخدم Instagram · 31206'
    )
  })
})

test('event mapping and preview sanitization', async (t) => {
  await t.test('formats postback and button taps without leaking ACT:: or JSON', () => {
    assert.equal(
      describeEvent({ type: 'postback', title: 'Get the price' }),
      'Tapped button "Get the price"'
    )
    assert.equal(
      formatMessagePreview('ACT::get_price_123'),
      'Tapped button "Get the price"'
    )
    assert.equal(
      formatMessagePreview('{"postback_id": "btn_45", "title": "Buy Now"}'),
      'Tapped button "Buy Now"'
    )
  })

  await t.test('formats comment trigger and handoff events', () => {
    assert.equal(
      describeEvent({ type: 'comment_trigger', keyword: 'price', postType: 'Reel', flowName: 'Glow kit' }),
      'Started by comment "price" on Reel · flow Glow kit'
    )
    assert.equal(
      describeEvent({ type: 'ai_handoff', reason: 'shipping question', assignedTo: 'Ziad' }),
      'AI paused: shipping question · assigned to Ziad'
    )
    assert.equal(
      describeEvent({ type: 'story_reply' }),
      'Replied to your story'
    )
  })

  await t.test('falls back safely on unknown types without raw JSON', () => {
    assert.equal(describeEvent({ type: 'unknown_vendor_event' }), 'Interaction')
    assert.equal(formatMessagePreview('{"weird_payload": true}'), 'Interaction')
  })
})

test('24-hour Meta messaging window countdown', async (t) => {
  const now = Date.now()

  await t.test('computes countdown for 22h 41m left (green/healthy)', () => {
    // 1 hour and 19 minutes ago = ~22h 41m remaining
    const lastInbound = new Date(now - (79 * 60 * 1000)).toISOString()
    const result = getWindowCountdown(lastInbound)
    assert.equal(result.isClosed, false)
    assert.equal(result.isWarning, false)
    assert.equal(result.hours, 22)
    assert.equal(result.minutes, 41)
    assert.equal(result.formatted, '22h 41m left')
  })

  await t.test('computes warning state for under 6 hours left (amber/warning)', () => {
    // 20 hours and 48 minutes ago = ~3h 12m remaining (matching mockup Window 3h 12m)
    const lastInbound = new Date(Date.now() - (20 * 60 * 60 * 1000 + 48 * 60 * 1000)).toISOString()
    const result = getWindowCountdown(lastInbound)
    assert.equal(result.isClosed, false)
    assert.equal(result.isWarning, true)
    assert.equal(result.hours, 3)
    assert.match(result.formatted, /3h 1[12]m left/)
  })

  await t.test('handles expired window (>24 hours) as closed', () => {
    // 25 hours ago = expired
    const lastInbound = new Date(now - (25 * 60 * 60 * 1000)).toISOString()
    const result = getWindowCountdown(lastInbound)
    assert.equal(result.isClosed, true)
    assert.equal(result.isWarning, false)
    assert.equal(result.formatted, 'Window closed')
  })

  await t.test('handles null or missing inbound as closed', () => {
    const result = getWindowCountdown(null)
    assert.equal(result.isClosed, true)
    assert.equal(result.formatted, 'Window closed')
  })
})
