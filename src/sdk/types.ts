import type { Conversation, Pair } from "@models";
import type { UserID } from "@sockets/ChatEvents";
import type { BaseTypingEvent } from "@interactions/typingObserver";


export type SDKStatus = "queued" | "running" | "done" | "error";
export type StatusMapper = (serverStatus: any) => SDKStatus;


export type ModerationDecision =
| { action: "allow"; text: string }
| { action: "modify"; text: string; reason?: string }
| { action: "block"; text: string; reason?: string };


export type ModerationStep = (text: string) => ModerationDecision | Promise<ModerationDecision>;


export interface ModeratorConfig {
pipeline: ModerationStep[];
onDecision?: (decision: ModerationDecision) => void;
}


export type SDKEvents = {
"connected": { chatId: string | number };
"disconnected": { chatId: string | number };


"conversation:update": { conversation: Conversation; changed?: Pair };
"pair:created": { pair: Pair };


"status:change": { pathId: string; from: SDKStatus; to: SDKStatus; meta?: any };


"ai:token": { token: string; index: number; cumulative: string };
"ai:message": { text: string; usage?: any };


"system:update": { nodeId: string; message: string; options?: string[]; timestamp?: number };
"chat:message": { text: string; createdAt?: number; raw?: any };
"presence:update": { onlineUserIds: UserID[] };


"typing": { kind: "start" | "pause" | "stop" | "tick"; snapshot: BaseTypingEvent };
"error": { error: unknown };
};


export type Unsub = () => void;


export class Emitter {
private handlers: { [K in keyof SDKEvents]?: Set<(p: any) => void> } = {};
on<K extends keyof SDKEvents>(e: K, fn: (p: SDKEvents[K]) => void): Unsub {
const set = (this.handlers[e] ??= new Set());
set.add(fn as any);
return () => this.off(e, fn);
}
off<K extends keyof SDKEvents>(e: K, fn: (p: SDKEvents[K]) => void) {
this.handlers[e]?.delete(fn as any);
}
emit<K extends keyof SDKEvents>(e: K, payload: SDKEvents[K]) {
for (const fn of new Set(this.handlers[e] ?? [])) (fn as any)(payload);
}
clear() {
(Object.keys(this.handlers) as (keyof SDKEvents)[]).forEach(k => this.handlers[k]?.clear());
}
}