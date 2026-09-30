export interface SequenceStep {
  id: string
  delayMs: number
  text?: string
  templateName?: string
  templateLanguage?: string
}

export interface Enrollment {
  id: string
  sequenceId: string
  contactExternalId: string
  channel: string
  stepIndex: number
  status: "active" | "completed" | "opted_out"
  nextSendAt: number | null
}

export function enrollContact(input: {
  id: string
  sequenceId: string
  contactExternalId: string
  channel: string
  steps: SequenceStep[]
  now: number
}): Enrollment {
  if (input.steps.length === 0) {
    return {
      id: input.id,
      sequenceId: input.sequenceId,
      contactExternalId: input.contactExternalId,
      channel: input.channel,
      stepIndex: 0,
      status: "completed",
      nextSendAt: null,
    }
  }
  return {
    id: input.id,
    sequenceId: input.sequenceId,
    contactExternalId: input.contactExternalId,
    channel: input.channel,
    stepIndex: 0,
    status: "active",
    nextSendAt: input.now + Math.max(0, input.steps[0].delayMs || 0),
  }
}

export function dueStep(enrollment: Enrollment, steps: SequenceStep[], now: number): SequenceStep | null {
  if (enrollment.status !== "active") return null
  if (enrollment.nextSendAt == null || enrollment.nextSendAt > now) return null
  return steps[enrollment.stepIndex] || null
}

export function markStepSent(enrollment: Enrollment, steps: SequenceStep[], now: number): Enrollment {
  const nextIndex = enrollment.stepIndex + 1
  if (nextIndex >= steps.length) {
    return { ...enrollment, stepIndex: nextIndex, status: "completed", nextSendAt: null }
  }
  return {
    ...enrollment,
    stepIndex: nextIndex,
    status: "active",
    nextSendAt: now + Math.max(0, steps[nextIndex].delayMs || 0),
  }
}

export function skipCurrentStep(enrollment: Enrollment, steps: SequenceStep[], now: number): Enrollment {
  return markStepSent(enrollment, steps, now)
}

export function cancelEnrollment(enrollment: Enrollment): Enrollment {
  return { ...enrollment, status: "opted_out", nextSendAt: null }
}

export function sequenceJobKey(enrollmentId: string, stepIndex: number): string {
  return `sequence:${enrollmentId}:${stepIndex}`
}
