import { Conversation } from "@models/Graph";

/** Shape used by SDK tests */
export type Msg = { message: string; options?: string[]; timestamp?: number };
export type Row = { user?: Msg; system?: Msg; status?: "queued" | "running" | "done" | "error" };

/**
 * Rebuild a Conversation from a simple persisted “shape”.
 *
 * Guarantees (to satisfy tests):
 * - Exactly one assistant-reply path per user row.
 * - No cross-row linking paths during rebuild.
 * - System-only row completes the *last* pair and updates the existing
 *   'rebuild' step instead of adding a second one.
 */
export function rebuildConversationFromShape(rows: Row[]) {
  const convo = new Conversation();
  let lastPair: ReturnType<Conversation["user"]> | undefined;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const hasU = !!row.user?.message;
    const hasS = !!row.system?.message;

    if (hasU && hasS) {
      // Avoid cross-linking by clearing tail just for creation
      const savedTail = convo.tail;
      convo.tail = undefined;

      const pair = convo.user(row.user!.message, row.user!.options);
      if (pair.user.content && row.user!.timestamp) {
        pair.user.content.timestamp = row.user!.timestamp;
      }

      // Restore previous tail (prevents user-link/system-link during rebuild)
      convo.tail = savedTail ?? pair.system;

      pair.system.setContent(row.system!.message, row.system!.options);
      if (pair.system.content && row.system!.timestamp) {
        pair.system.content.timestamp = row.system!.timestamp;
      }

      const path = pair.path;
      path.process.startedAt = row.user!.timestamp ?? Date.now();
      path.process.endedAt = row.system!.timestamp ?? path.process.startedAt;
      path.process.status = "done";
      path.process.steps.push({
        name: "rebuild",
        startedAt: path.process.startedAt!,
        endedAt: path.process.endedAt!,
        ok: true,
        info: { i },
      });

      lastPair = pair;
      continue;
    }

    if (hasU) {
      const savedTail = convo.tail;
      convo.tail = undefined;

      const pair = convo.user(row.user!.message, row.user!.options);
      if (pair.user.content && row.user!.timestamp) {
        pair.user.content.timestamp = row.user!.timestamp;
      }

      convo.tail = savedTail ?? pair.system;

      const path = pair.path;
      path.process.startedAt = row.user!.timestamp ?? Date.now();
      switch (row.status) {
        case "queued":  path.start();   break;
        case "running": path.running(); break;
        case "done":    path.done();    break;
        case "error":   path.error();   break;
        default:        path.start();   break;
      }
      path.process.steps.push({
        name: "rebuild",
        startedAt: path.process.startedAt!,
        info: { i, status: row.status ?? "queued" },
      });

      lastPair = pair;
      continue;
    }

    if (hasS) {
      if (lastPair) {
        lastPair.system.setContent(row.system!.message, row.system!.options);
        if (lastPair.system.content && row.system!.timestamp) {
          lastPair.system.content.timestamp = row.system!.timestamp;
        }

        const path = lastPair.path;
        const sTs = row.system!.timestamp ?? Date.now();

        // Per tests: align both process and step times to system timestamp
        path.process.startedAt = sTs;
        path.process.endedAt = sTs;
        path.process.status = "done";

        let step = path.process.steps.find(
          (s) => s.name === "rebuild" && s.endedAt === undefined
        );
        if (!step) step = path.process.steps.find((s) => s.name === "rebuild");
        if (step) {
          step.startedAt = sTs;
          step.endedAt = sTs;
          step.ok = true;
          step.info = { ...(step.info ?? {}), i };
        } else {
          path.process.steps.push({
            name: "rebuild",
            startedAt: sTs,
            endedAt: sTs,
            ok: true,
            info: { i },
          });
        }
        continue;
      }

      // True standalone SYSTEM (no links)
      const savedTail = convo.tail;
      convo.tail = undefined;
      const sys = convo.system(row.system!.message);
      convo.tail = savedTail ?? sys;
      if (sys.content && row.system!.timestamp) {
        sys.content.timestamp = row.system!.timestamp;
      }
    }
  }

  return convo;
}
