import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ChatSDK } from '@/sdk/ChatSDK'
import { Conversation } from '@models'

// --- Polyfill lastPair() if your Conversation doesn't have it ---
;(Conversation.prototype as any).lastPair ??= function () {
  const lastPath = this.paths[this.paths.length - 1]
  if (!lastPath) return undefined
  const user = this.nodes.find((n: any) => n.id === lastPath.fromId)
  const system = this.nodes.find((n: any) => n.id === lastPath.toId)
  return { user, system, path: lastPath }
}

// --- Minimal mock for your AIChatSocket public surface ---
type Cb = ReturnType<typeof makeCallbacks>
function makeCallbacks() {
  return {
    onConnect:        undefined as ((info: { chatId: any }) => void) | undefined,
    onDisconnect:     undefined as ((info: { chatId: any }) => void) | undefined,
    onServerError:    undefined as ((error: unknown) => void) | undefined,

    onChatMessage:    undefined as ((e: any) => void) | undefined,
    onPresenceUpdate: undefined as ((e: any) => void) | undefined,

    onAIProcessing:   undefined as ((e: any) => void) | undefined,
    onAIToken:        undefined as ((e: any) => void) | undefined,
    onAIMessage:      undefined as ((e: any) => void) | undefined,
    onAIError:        undefined as ((e: any) => void) | undefined,
  }
}
class MockAIChatSocket {
  callbacks: Cb = makeCallbacks()
  sent: any[] = []
  aborts: any[] = []
  reads: any[] = []
  typing: any[] = []
  connected = false

  setCallbacks(cb: Partial<Cb>) { this.callbacks = { ...this.callbacks, ...cb } }
  connect() { this.connected = true; this.callbacks.onConnect?.({ chatId: 'room-42' }) }
  disconnect() { this.connected = false; this.callbacks.onDisconnect?.({ chatId: 'room-42' }) }

  sendMessage(payload: any) { this.sent.push(payload) }
  abort(reason?: string)    { this.aborts.push(reason) }
  markRead(payload: any)    { this.reads.push(payload) }
  typingStart(userId: any)  { this.typing.push({ kind: 'start', userId }) }
  typingStop(userId: any)   { this.typing.push({ kind: 'stop', userId }) }

  // helpers to simulate server -> client
  emitProcessing(e: any) { this.callbacks.onAIProcessing?.(e) }
  emitToken(e: any)      { this.callbacks.onAIToken?.(e) }
  emitMessage(e: any)    { this.callbacks.onAIMessage?.(e) }
  emitError(e: any)      { this.callbacks.onAIError?.(e) }
  emitChat(e: any)       { this.callbacks.onChatMessage?.(e) }
  emitPresence(e: any)   { this.callbacks.onPresenceUpdate?.(e) }
}

describe('ChatSDK', () => {
  const chatId = 'room-42'
  const userId = 'u-123'

  it('sendText → creates pair, streams tokens, finalizes, and calls socket', async () => {
    const sock = new MockAIChatSocket()
    const sdk = new ChatSDK({
      socket: sock as any,
      chatId,
      userId,
      mapStatus: s => (s === 'working' ? 'running' : (s as any)),
    })

    const events: any[] = []
    const offCU = sdk.on('conversation:update', ({ conversation }) => events.push(['cu', conversation.nodes.length]))
    const offSC = sdk.on('status:change', e => events.push(['status', e.from, e.to]))
    const offTK = sdk.on('ai:token', e => events.push(['tok', e.index, e.token, e.cumulative]))
    const offMX = sdk.on('ai:message', e => events.push(['final', e.text]))
    const offSU = sdk.on('system:update', e => events.push(['sys', e.message]))
    const offER = sdk.on('error', e => events.push(['err', e.error]))

    sock.connect()

    const pair = await sdk.sendText('Hello')
    expect(pair).toBeTruthy()
    expect(sock.sent.length).toBe(1)
    expect(sock.sent[0].text).toBe('Hello')
    expect(sock.sent[0].messageId).toBe(pair!.user.id)
    expect(sock.sent[0].requestId).toBe(pair!.path.id)

    sock.emitProcessing({ status: 'working' })
    sock.emitToken({ token: 'Hi ', index: 0 })
    sock.emitToken({ token: 'there', index: 1 })

    const createdAt = new Date().toISOString()
    sock.emitMessage({ text: 'Hi there', createdAt, usage: { totalTokens: 10 } })

    expect(events.some(e => e[0] === 'status' && e[2] === 'running')).toBe(true)
    expect(events.filter(e => e[0] === 'tok').length).toBe(2)
    expect(events.some(e => e[0] === 'final' && e[1] === 'Hi there')).toBe(true)
    expect(events.some(e => e[0] === 'sys' && e[1] === 'Hi ')).toBe(true)
    expect(events.some(e => e[0] === 'sys' && e[1] === 'Hi there')).toBe(true)

    offCU(); offSC(); offTK(); offMX(); offSU(); offER()
  })

  it('abort and markRead delegate to socket', async () => {
    const sock = new MockAIChatSocket()
    const sdk = new ChatSDK({ socket: sock as any, chatId, userId })

    await sdk.sendText('Yo')
    sdk.abort('cancel')
    expect(sock.aborts).toEqual(['cancel'])

    sdk.markRead(['m1', 'm2'], '2025-09-22T01:02:03.000Z')
    expect(sock.reads[0]).toEqual({ userId, messageIds: ['m1', 'm2'], readAt: '2025-09-22T01:02:03.000Z' })
  })

  it('handles AI errors and presence/chat passthrough', async () => {
    const sock = new MockAIChatSocket()
    const sdk = new ChatSDK({ socket: sock as any, chatId, userId })

    const errs: any[] = []
    const chats: any[] = []
    const pres: any[] = []

    const offE = sdk.on('error', e => errs.push(e.error))
    const offC = sdk.on('chat:message', e => chats.push(e.text))
    const offP = sdk.on('presence:update', e => pres.push(e.onlineUserIds))

    const pair = await sdk.sendText('Boom me')
    sock.emitError({ code: 'X', message: 'nope' })
    sock.emitPresence({ onlineUserIds: [userId, 'u-222'] })
    sock.emitChat({ text: 'hello from server', createdAt: new Date().toISOString() })

    expect(errs.length).toBe(1)
    expect(String(errs[0]?.message || errs[0])).toMatch(/nope/i)
    expect(pres[0]).toEqual([userId, 'u-222'])
    expect(chats[0]).toBe('hello from server')

    offE(); offC(); offP()
  })
})
