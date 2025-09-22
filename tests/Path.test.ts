import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Path } from '@/models/Path'

describe('Path', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2025-01-01T00:00:00.000Z'))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('constructor applies fromId/toId/label, starts notStarted', () => {
    const p = new Path('A', 'B', 'assistant-reply')
    expect(p.fromId).toBe('A')
    expect(p.toId).toBe('B')
    expect(p.process.label).toBe('assistant-reply')
    expect(p.process.status).toBe('notStarted')
    expect(p.process.steps).toEqual([])
  })

  it('start() queues and sets startedAt (idempotent with running())', () => {
    const p = new Path('A', 'B')
    p.start()
    expect(p.process.status).toBe('queued')
    expect(typeof p.process.startedAt).toBe('number')

    p.running()
    expect(p.process.status).toBe('running')
    const started = p.process.startedAt
    p.running() // idempotent
    expect(p.process.startedAt).toBe(started)
  })

  it('step() auto ensures running and closes previous step on new step', () => {
    const p = new Path('A', 'B')
    p.step('first') // should ensure running
    expect(p.process.status).toBe('running')
    expect(p.process.steps).toHaveLength(1)
    expect(p.process.steps[0].name).toBe('first')
    expect(p.process.steps[0].endedAt).toBeUndefined()

    vi.advanceTimersByTime(50)
    p.step('second')
    expect(p.process.steps).toHaveLength(2)
    expect(p.process.steps[0].endedAt).toBeTypeOf('number') // closed
    expect(p.process.steps[1].name).toBe('second')
  })

  it('endStep() marks current step ok and merges extra info', () => {
    const p = new Path('A', 'B')
    p.step('fetch', { a: 1 })
    p.endStep(true, { b: 2 })
    const s = p.process.steps[0]
    expect(s.ok).toBe(true)
    expect(s.endedAt).toBeTypeOf('number')
    expect(s.info).toEqual({ a: 1, b: 2 })
  })

  it('done() closes path and any open step', () => {
    const p = new Path('A', 'B')
    p.step('work')
    p.done()
    expect(p.process.status).toBe('done')
    expect(p.process.endedAt).toBeTypeOf('number')
    expect(p.process.steps[0].endedAt).toBeTypeOf('number')
    expect(p.isDone()).toBe(true)
  })

  it('error() marks error, closes step, and records error step with info', () => {
    const p = new Path('A', 'B')
    p.step('work')
    p.error({ code: 'X' })
    expect(p.process.status).toBe('error')
    expect(p.hasError()).toBe(true)
    const last = p.process.steps[p.process.steps.length - 1]
    expect(last.name).toBe('error')
    expect(last.ok).toBe(false)
    expect(last.info?.code).toBe('X')
  })

  it('totalMs() reflects elapsed between startedAt and endedAt/now', () => {
    const p = new Path('A', 'B')
    p.start()
    vi.advanceTimersByTime(120)
    expect(p.totalMs()).toBe(120)

    vi.advanceTimersByTime(80)
    p.done()
    const afterDone = p.totalMs()
    expect(afterDone).toBeGreaterThanOrEqual(200)
  })

  it('withStep() completes on success and marks failure on throw', async () => {
    const p = new Path('A', 'B')

    const out = await p.withStep('ok', () => 42)
    expect(out).toBe(42)
    const lastOk = p.process.steps[p.process.steps.length - 1]
    expect(lastOk.name).toBe('ok')
    expect(lastOk.ok).toBe(true)

    await expect(p.withStep('boom', () => { throw new Error('bad') })).rejects.toThrow('bad')
    const lastFail = p.process.steps[p.process.steps.length - 1]
    expect(lastFail.name).toBe('boom')
    expect(lastFail.ok).toBe(false)
    expect(lastFail.info?.error).toMatch(/bad/)
  })
})
