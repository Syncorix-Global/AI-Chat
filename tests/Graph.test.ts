import { describe, it, expect } from 'vitest'
import { Conversation } from '@models'
import { NodeStatus, NodeType } from '@/models/Node'

describe('Conversation', () => {
  it('system() appends a SYSTEM node, links from tail via system-link when needed', () => {
    const c = new Conversation()
    const s1 = c.system('hello')
    expect(c.head).toBe(s1)
    expect(c.tail).toBe(s1)
    expect(s1.type).toBe(NodeType.SYSTEM)
    expect(c.nodes).toHaveLength(1)
    expect(c.paths).toHaveLength(0)

    const s2 = c.system('again')
    expect(c.tail).toBe(s2)
    expect(c.nodes).toHaveLength(2)
    expect(c.paths).toHaveLength(1)
    expect(c.paths[0].process.label).toBe('system-link')
    expect(c.paths[0].process.status).toBe('queued') // link() .start()
  })

  it('user() creates USER + paired SYSTEM with assistant-reply path', () => {
    const c = new Conversation()
    const { user, system, path } = c.user('hi', ['opt'])
    expect(user.type).toBe(NodeType.USER)
    expect(system.type).toBe(NodeType.SYSTEM)
    expect(user.content?.message).toBe('hi')
    expect(user.content?.options).toEqual(['opt'])
    expect(path.process.label).toBe('assistant-reply')
    expect(path.process.status).toBe('queued') // link() .start()
    expect(c.tail).toBe(system)

    // previous tail → USER link is "user-link" if a tail existed
    const { path: p2 } = c.user('next')
    expect(c.paths[0].process.label).toBe('assistant-reply') // first pair
    expect(c.paths[1].process.label).toBe('user-link')       // tail→user
    expect(c.paths[2].process.label).toBe('assistant-reply') // second pair
  })

  it('beginAssistantWork() adds a "work:begin" step', () => {
    const c = new Conversation()
    const pair = c.user('hi')
    c.beginAssistantWork(pair, { foo: 1 })
    const step = pair.path.process.steps.at(-1)!
    expect(step.name).toBe('work:begin')
    expect(step.info?.foo).toBe(1)
  })

  it('resolveAssistant() writes reply, closes step (if info) and marks done', () => {
    const c = new Conversation()
    const pair = c.user('hi')
    c.beginAssistantWork(pair)
    c.resolveAssistant(pair, 'hello', { meta: true })
    expect(pair.system.content?.message).toBe('hello')
    expect(pair.path.process.status).toBe('done')
    const last = pair.path.process.steps.at(-1)!
    expect(last.ok).toBe(true)
    expect(last.info?.meta).toBe(true)
  })

  it('failAssistant() marks system error and path error; sets default message if missing', () => {
    const c = new Conversation()
    const pair = c.user('hi')
    // ensure SYSTEM has no content yet
    pair.system.content = undefined
    c.failAssistant(pair, { code: 'X' })
    expect(pair.system.status).toBe(NodeStatus.ERROR)
    expect(pair.path.process.status).toBe('error')
    const last = pair.path.process.steps.at(-1)!
    expect(last.name).toBe('error')
    expect(last.info?.code).toBe('X')
  })

  it('lastPair() returns the latest USER→SYSTEM pair', () => {
    const c = new Conversation()
    expect(c.lastPair()).toBeUndefined()
    const p1 = c.user('a'); const last1 = c.lastPair()
    expect(last1?.user.id).toBe(p1.user.id)
    const p2 = c.user('b'); const last2 = c.lastPair()
    expect(last2?.user.id).toBe(p2.user.id)
  })

  it('userQuick() creates pair and immediately resolves reply', () => {
    const c = new Conversation()
    const pair = c.userQuick('Q', 'A', ['x'])
    expect(pair.user.content?.message).toBe('Q')
    expect(pair.system.content?.message).toBe('A')
    expect(pair.path.process.status).toBe('done')
  })

  it('userAsync(): resolves string or {reply, info}, catches errors', async () => {
    const c = new Conversation()

    const p1 = await c.userAsync('X', () => 'Y')
    expect(p1.system.content?.message).toBe('Y')
    expect(p1.path.process.status).toBe('done')

    const p2 = await c.userAsync('X', () => ({ reply: 'Z', info: { a: 1 } }))
    const last2 = p2.path.process.steps.at(-1)!
    expect(p2.system.content?.message).toBe('Z')
    expect(last2.ok).toBe(true)
    expect(last2.info?.a).toBe(1)

    const p3 = await c.userAsync('X', () => { throw new Error('boom') })
    expect(p3.system.status).toBe(NodeStatus.ERROR)
    expect(p3.path.process.status).toBe('error')
  })

  it('chain() iterates nodes in order; head/tail/byId are maintained', () => {
    const c = new Conversation()
    const a = c.system('s1')
    const { user: u, system: s } = c.user('hi')

    // 👇 Explicit typing avoids never[]
    const names: (string | undefined)[] = []
    for (const n of c.chain()) {
      names.push(n.content?.message)
    }
    expect(names).toEqual(['s1', 'hi', undefined]) // system placeholder has no content until resolved

    expect(c.head?.id).toBe(a.id)
    expect(c.tail?.id).toBe(s.id)
    expect(c.byId.get(u.id)?.id).toBe(u.id)
  })
})
