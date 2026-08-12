import type { TurnTimelineItem } from './materialize.js';

/**
 * Render-layer fold for the collapsed "Processing" block (#1307).
 *
 * The turn timeline model (`TurnTimelineItem`) stays FLAT — every
 * timeline-rewriting pass (overlayLiveTurn, projectTurnTools, shell-run
 * folding) operates on the raw thinking/text/tools sequence and never has to
 * maintain a nesting invariant. This module derives the folded view right
 * before rendering:
 *
 *  - answer `text` entries stay in place and are the only grouping boundary;
 *  - a maximal thinking+tools run between two texts folds into ONE stable
 *    `processing` sequence, preserving the run's interleaved order as
 *    `children` even before its first tool arrives;
 *
 * Each block carries a stable `id` derived from the PRECEDING answer text's
 * messageId (`'start'` when the block opens the turn). Between two texts there
 * is at most one block, so the id is unique per turn — and, unlike a key
 * guessed from the first child, it survives the first tool being projected
 * away (shell-run folding) without remounting the disclosure or dropping a
 * manual open/close. Keeping a pure-thinking run in that same layout-only
 * sequence also prevents a live reasoning entry from remounting when the
 * runtime emits `tool_start` before `thinking_complete`.
 */

/** An entry folded inside a processing block: reasoning or a tool group. */
export type FoldedTimelineChild = Extract<TurnTimelineItem, { kind: 'thinking' | 'tools' }>;

export interface ProcessingFold {
  kind: 'processing';
  /** Stable identity: `'start'` or the preceding answer text's messageId. */
  id: string;
  children: FoldedTimelineChild[];
}

export type FoldedTimelineEntry = TurnTimelineItem | ProcessingFold;

export function foldTimeline(items: readonly TurnTimelineItem[]): FoldedTimelineEntry[] {
  const out: FoldedTimelineEntry[] = [];
  let anchor = 'start';
  let buffer: FoldedTimelineChild[] | null = null;
  const flush = (): void => {
    if (buffer && buffer.length > 0) {
      out.push({ kind: 'processing', id: anchor, children: buffer });
    }
    buffer = null;
  };
  for (const item of items) {
    if (item.kind === 'thinking' || item.kind === 'tools') {
      (buffer ??= []).push(item);
    } else {
      flush();
      out.push(item);
      anchor = item.messageId;
    }
  }
  flush();
  return out;
}
