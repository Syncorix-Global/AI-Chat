import { describe, it, expect } from 'vitest'
import { Node, NodeType, NodeStatus } from '@models/Node'

describe('Node', () => {
  it('initializes with type/status and generates id/createdAt', () => {
    const n = new Node(NodeType.USER, NodeStatus.PROCESSING)
    expect(n.id).toBeTruthy()
    expect(typeof n.createdAt).toBe('number')
    expect(n.type).toBe(NodeType.USER)
    expect(n.status).toBe(NodeStatus.PROCESSING)
    expect(n.content).toBeUndefined()
  })

  it('setContent sets message/options/timestamp and marks READY', () => {
    const n = new Node(NodeType.SYSTEM)
    n.setContent('hello', ['opt1', 'opt2'])
    expect(n.status).toBe(NodeStatus.READY)
    expect(n.content?.message).toBe('hello')
    expect(n.content?.options).toEqual(['opt1', 'opt2'])
    expect(typeof n.content?.timestamp).toBe('number')
  })

  it('helpers: isUser/isSystem/isReady/isError', () => {
    const a = new Node(NodeType.USER)
    const b = new Node(NodeType.SYSTEM)
    expect(a.isUser()).toBe(true)
    expect(a.isSystem()).toBe(false)
    expect(b.isSystem()).toBe(true)
    expect(b.isUser()).toBe(false)

    expect(a.isReady()).toBe(false)
    a.setContent('x')
    expect(a.isReady()).toBe(true)

    const c = new Node(NodeType.SYSTEM, NodeStatus.ERROR)
    expect(c.isError()).toBe(true)
  })
})
