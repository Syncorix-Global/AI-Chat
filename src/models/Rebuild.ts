import { Conversation } from "@models/Graph";

/**
 * Transcript _Row types:
 * - Each side is a tuple [ text, timestampMs ]
 */
export type Tuple = [message: string, timestampMs: number];
export type _Row = { user?: Tuple; system?: Tuple };

/**
 * Rebuild a Conversation from a flat transcript.
 *
 * Key rules that match the tests:
 * - Avoid cross-_Row links (no user-link/system-link during rebuild).
 * - When a system-only _Row arrives, finish the *last pair’s* path and
 *   set both process.startedAt and the 'rebuild' step's startedAt to the system timestamp.
 */
export function rebuildConversationFromTranscript(_Rows: _Row[]) {
  const convo = new Conversation();

  // Track the last USER→SYSTEM pair we created so a subsequent system-only _Row
  // can finish it deterministically.
  let lastPair: ReturnType<Conversation["user"]> | undefined;

  _Rows.forEach((_Row, index) => {
    const hasUser = Array.isArray(_Row.user) && typeof _Row.user[0] === "string";
    const hasSystem = Array.isArray(_Row.system) && typeof _Row.system[0] === "string";

    if (hasUser && hasSystem) {
      const [uText, uTs] = _Row.user!;
      const [sText, sTs] = _Row.system!;

      // Avoid cross-linking: temporarily clear tail before creating the pair.
      const savedTail = convo.tail;
      convo.tail = undefined;

      const pair = convo.user(uText);
      if (pair.user.content) pair.user.content.timestamp = uTs;

      convo.tail = savedTail ?? pair.system;

      pair.system.setContent(sText);
      if (pair.system.content) pair.system.content.timestamp = sTs;

      const p = pair.path;
      p.process.startedAt = Math.min(uTs, sTs);
      p.process.endedAt = sTs;
      p.process.status = "done";
      p.process.steps.push({
        name: "rebuild",
        startedAt: uTs,
        endedAt: sTs,
        ok: true,
        info: { imported: true, index },
      });

      lastPair = pair;
      return;
    }

    if (hasUser) {
      const [uText, uTs] = _Row.user!;

      const savedTail = convo.tail;
      convo.tail = undefined;

      const pair = convo.user(uText);
      if (pair.user.content) pair.user.content.timestamp = uTs;

      convo.tail = savedTail ?? pair.system;

      const p = pair.path;
      p.process.startedAt = uTs;
      p.process.status = "queued";
      p.process.steps.push({
        name: "rebuild",
        startedAt: uTs,
        info: { imported: true, index },
      });

      lastPair = pair;
      return;
    }

    if (hasSystem) {
      const [sText, sTs] = _Row.system!;

      if (lastPair) {
        // Fill the last pair's SYSTEM bubble and finish its path.
        lastPair.system.setContent(sText);
        if (lastPair.system.content) lastPair.system.content.timestamp = sTs;

        const p = lastPair.path;

        // Tests expect startedAt to become the system timestamp in this branch.
        p.process.startedAt = sTs;
        p.process.endedAt = sTs;
        p.process.status = "done";

        // Update the existing 'rebuild' step if present; otherwise add one.
        let step = p.process.steps.find((s) => s.name === "rebuild" && s.endedAt === undefined);
        if (!step) step = p.process.steps.find((s) => s.name === "rebuild");
        if (step) {
          step.startedAt = sTs;
          step.endedAt = sTs;
          step.ok = true;
          step.info = { ...(step.info ?? {}), imported: true, index };
        } else {
          p.process.steps.push({
            name: "rebuild",
            startedAt: sTs,
            endedAt: sTs,
            ok: true,
            info: { imported: true, index },
          });
        }
        return;
      }

      // Fallback: standalone SYSTEM (no cross-link)
      const savedTail = convo.tail;
      convo.tail = undefined;
      const sys = convo.system(sText);
      convo.tail = savedTail ?? sys;
      if (sys.content) sys.content.timestamp = sTs;
      return;
    }

    // empty _Row → skip
  });

  return convo;
}

/** Dump only assistant-reply turns back into _Row[] (what tests exercise). */
export function dumpTranscript(convo: Conversation): _Row[] {
  const _Rows: _Row[] = [];
  for (const path of convo.paths) {
    if (path.process.label !== "assistant-reply") continue;

    const user = convo.nodes.find((n) => n.id === path.fromId);
    const system = convo.nodes.find((n) => n.id === path.toId);

    const _Row: _Row = {};
    if (user?.content?.message) {
      _Row.user = [user.content.message, user.content.timestamp ?? user.createdAt];
    }
    if (system?.content?.message) {
      _Row.system = [system.content.message, system.content.timestamp ?? system.createdAt];
    }
    if (_Row.user || _Row.system) _Rows.push(_Row);
  }
  return _Rows;
}
