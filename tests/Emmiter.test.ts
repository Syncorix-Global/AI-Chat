import { describe, it, expect } from 'vitest'
import { Emitter } from '@/sdk/types'

describe('Emitter', () => {
  it('registers and emits to multiple listeners', () => {
    const bus = new Emitter()
    const seen: any[] = []

    const offA = bus.on('ai:message', p => seen.push(['A', p.text]))
    const offB = bus.on('ai:message', p => seen.push(['B', p.text]))

    bus.emit('ai:message', { text: 'hello', usage: undefined })

    expect(seen).toEqual([
      ['A', 'hello'],
      ['B', 'hello'],
    ])

    offA()
    offB()
  })

  it('supports unsubscribe and clear', () => {
    const bus = new Emitter()
    const seen: any[] = []

    const off = bus.on('error', e => seen.push(e.error))
    bus.emit('error', { error: 'boom' })
    expect(seen).toEqual(['boom'])

    off() // unsubscribe
    bus.emit('error', { error: 'ignored' })
    expect(seen).toEqual(['boom'])

    // re-add + clear() wipes listeners
    bus.on('error', e => seen.push(e.error))
    bus.clear()
    bus.emit('error', { error: 'still ignored' })
    expect(seen).toEqual(['boom'])
  })

  it('emits conversation:update payloads', () => {
    const bus = new Emitter()
    const spy: any[] = []
    bus.on('conversation:update', p => spy.push(p))

    bus.emit('conversation:update', { conversation: { nodes: [], paths: [] } as any, changed: undefined })
    expect(spy).toHaveLength(1)
  })
})
