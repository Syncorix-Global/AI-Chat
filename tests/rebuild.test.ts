import { describe, it, expect } from 'vitest'
import { rebuildConversationFromShape } from '@/sdk/rebuild'
import { Conversation } from '@models'

type Msg = { message: string; options?: string[]; timestamp?: number }
type Row = { user?: Msg; system?: Msg; status?: 'queued'|'running'|'done'|'error' }

describe('rebuildConversationFromShape', () => {
  it('returns a Conversation instance', () => {
    const convo = rebuildConversationFromShape([])
    expect(convo).toBeInstanceOf(Conversation)
    expect(convo.nodes.length).toBe(0)
    expect(convo.paths.length).toBe(0)
  })

  it('creates a USER→SYSTEM pair (done) when both present', () => {
    const now = Date.now()
    const rows: Row[] = [
      { user: { message: 'U1', timestamp: now - 1000 }, system: { message: 'S1', timestamp: now } },
    ]
    const convo = rebuildConversationFromShape(rows)

    expect(convo.nodes.length).toBe(2)
    expect(convo.paths.length).toBe(1)

    const path = convo.paths[0]
    const from = convo.nodes.find(n => n.id === path.fromId)!
    const to   = convo.nodes.find(n => n.id === path.toId)!

    expect(path.process.status).toBe('done')
    expect(from.content?.message).toBe('U1')
    expect(to.content?.message).toBe('S1')
    expect(from.content?.timestamp).toBe(now - 1000)
    expect(to.content?.timestamp).toBe(now)
  })

  it('creates pairs with correct status when only user is present', () => {
    const rows: Row[] = [
      { user: { message: 'U1' }, status: 'queued' },
      { user: { message: 'U2' }, status: 'running' },
      { user: { message: 'U3' }, status: 'done' },
      { user: { message: 'U4' }, status: 'error' },
    ]
    const convo = rebuildConversationFromShape(rows)

    expect(convo.paths.length).toBe(4)
    expect(convo.paths[0].process.status).toBe('queued')
    expect(convo.paths[1].process.status).toBe('running')
    expect(convo.paths[2].process.status).toBe('done')
    expect(convo.paths[3].process.status).toBe('error')
  })

  it('appends standalone SYSTEM and finishes last path', () => {
    const rows: Row[] = [
      { user: { message: 'U1' }, status: 'running' },
      { system: { message: 'S1' } }, // closes last path as done
    ]
    const convo = rebuildConversationFromShape(rows)

    expect(convo.nodes.length).toBe(2)
    expect(convo.paths.length).toBe(1)
    expect(convo.paths[0].process.status).toBe('done')
    expect(convo.paths[0].process.endedAt).toBeDefined()
  })
})
