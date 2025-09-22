import { describe, it, expect } from 'vitest'
import { rebuildConversationFromTranscript, dumpTranscript, type _Row } from '@models' // <-- adjust path
import { Conversation } from '@models'

describe('Transcript rebuild/dump', () => {
  it('rebuilds a pair when _Row has user and system', () => {
    const uTs = 1726900000000
    const sTs = 1726900005000
    const _Rows: _Row[] = [
      { user: ['U1', uTs], system: ['S1', sTs] },
    ]
    const convo = rebuildConversationFromTranscript(_Rows)
    expect(convo).toBeInstanceOf(Conversation)
    expect(convo.nodes.length).toBe(2)
    expect(convo.paths.length).toBe(1)
    const path = convo.paths[0]
    expect(path.process.status).toBe('done')

    const user = convo.nodes.find(n => n.id === path.fromId)!
    const system = convo.nodes.find(n => n.id === path.toId)!
    expect(user.content?.message).toBe('U1')
    expect(user.content?.timestamp).toBe(uTs)
    expect(system.content?.message).toBe('S1')
    expect(system.content?.timestamp).toBe(sTs)

    // step recorded with correct times
    const step = path.process.steps.find(s => s.name === 'rebuild')!
    expect(step.startedAt).toBe(uTs)
    expect(step.endedAt).toBe(sTs)
    expect(step.ok).toBe(true)
    expect(step.info?.imported).toBe(true)
  })

  it('rebuilds user-only _Row as queued with open step', () => {
    const uTs = 1726900000000
    const _Rows: _Row[] = [ { user: ['U1', uTs] } ]
    const convo = rebuildConversationFromTranscript(_Rows)
    expect(convo.paths).toHaveLength(1)
    const path = convo.paths[0]
    expect(path.process.status).toBe('queued')
    expect(path.process.startedAt).toBe(uTs)
    const step = path.process.steps.find(s => s.name === 'rebuild')!
    expect(step.startedAt).toBe(uTs)
    expect(step.endedAt).toBeUndefined()
  })

  it('rebuilds system-only by appending SYSTEM and finalizing previous path', () => {
    const uTs = 1726900000000
    const sTs = 1726900003000
    const _Rows: _Row[] = [
      { user: ['U1', uTs] },         // creates queued path
      { system: ['S1', sTs] },       // appends system; finalizes last path
    ]
    const convo = rebuildConversationFromTranscript(_Rows)
    expect(convo.nodes.length).toBe(2)
    expect(convo.paths.length).toBe(1)
    const path = convo.paths[0]
    expect(path.process.status).toBe('done')
    // Per implementation, system-only branch sets startedAt = sTs and endedAt = sTs
    expect(path.process.startedAt).toBe(sTs)
    expect(path.process.endedAt).toBe(sTs)
    const step = path.process.steps.find(s => s.name === 'rebuild')!
    expect(step.startedAt).toBe(sTs)
    expect(step.endedAt).toBe(sTs)
  })

  it('dumpTranscript round-trips with rebuildConversationFromTranscript', () => {
    const _Rows: _Row[] = [
      { user: ['U1', 1], system: ['S1', 2] },
      { user: ['U2', 3] },
      { system: ['S2', 4] }, // finishes U2
    ]
    const rebuilt = rebuildConversationFromTranscript(_Rows)
    const dumped = dumpTranscript(rebuilt)

    // Round-trip should preserve the messages sequence and timestamps
    expect(dumped).toEqual([
      { user: ['U1', 1], system: ['S1', 2] },
      { user: ['U2', 3], system: ['S2', 4] },
    ])
  })

  it('ignores empty _Rows', () => {
    const _Rows: _Row[] = [
      { user: ['U1', 1], system: ['S1', 2] },
      { }, // empty
      { user: ['U2', 3] },
    ]
    const convo = rebuildConversationFromTranscript(_Rows)
    expect(convo.paths.length).toBe(2) // U1->S1 (done), U2->(queued)
  })
})
