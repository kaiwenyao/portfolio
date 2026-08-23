// Reveals already-rendered, syntax-coloured markup one character at a time.
//
// The block is expected to hold one element per line. Only the text nodes are
// blanked and refilled — the coloured spans around them stay untouched, which
// is what keeps highlighting intact mid-stream. A caret element is moved to
// the write head as it goes.

const DEFAULT_CHARS_PER_TICK = 2;
const DEFAULT_LINE_PAUSE_MS = 90;

export interface TypewriterOptions {
  charsPerTick?: number;
  linePauseMs?: number;
  onAdvance?: () => void;
  onDone?: () => void;
}

export interface Typewriter {
  /** Empty every line, ready to be played. Safe to call before revealing. */
  blank: () => void;
  play: () => void;
  reveal: () => void;
  cancel: () => void;
}

/**
 * Text nodes of every line in the block, in document order. Walking the line
 * elements rather than the block skips the whitespace-only nodes a template
 * leaves between them, which would otherwise park the caret outside a line.
 */
function collectLineTextNodes(block: Element): Text[] {
  const nodes: Text[] = [];
  for (const line of Array.from(block.children)) {
    const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  }
  return nodes;
}

function park(caret: HTMLElement, node: Text | undefined): void {
  node?.parentElement?.appendChild(caret);
}

export function createTypewriter(
  block: Element,
  caret: HTMLElement,
  options: TypewriterOptions = {},
): Typewriter {
  const charsPerTick = options.charsPerTick ?? DEFAULT_CHARS_PER_TICK;
  const linePauseMs = options.linePauseMs ?? DEFAULT_LINE_PAUSE_MS;

  const nodes = collectLineTextNodes(block);
  const contents = nodes.map((node) => node.nodeValue ?? '');

  let nodeIndex = 0;
  let charIndex = 0;
  let pausedUntil = 0;
  let raf: number | null = null;

  function reveal(): void {
    cancel();
    nodes.forEach((node, i) => {
      node.nodeValue = contents[i];
    });
    nodeIndex = nodes.length;
    park(caret, nodes[nodes.length - 1]);
    options.onDone?.();
  }

  function cancel(): void {
    if (raf === null) return;
    cancelAnimationFrame(raf);
    raf = null;
  }

  function step(now: number): void {
    if (now < pausedUntil) {
      raf = requestAnimationFrame(step);
      return;
    }

    for (let budget = charsPerTick; budget > 0; budget--) {
      while (nodeIndex < nodes.length && charIndex >= contents[nodeIndex].length) {
        nodeIndex++;
        charIndex = 0;
      }
      if (nodeIndex >= nodes.length) {
        raf = null;
        options.onAdvance?.();
        options.onDone?.();
        return;
      }

      const node = nodes[nodeIndex];
      const text = contents[nodeIndex];
      charIndex++;
      node.nodeValue = text.slice(0, charIndex);
      park(caret, node);

      // Whitespace runs cost nothing, so indentation snaps into place.
      if (text[charIndex - 1] === ' ') budget++;

      // A finished node that closes a line earns a beat.
      if (charIndex >= text.length && node.parentElement?.nextElementSibling === null) {
        pausedUntil = now + linePauseMs;
        break;
      }
    }

    options.onAdvance?.();
    raf = requestAnimationFrame(step);
  }

  function blank(): void {
    cancel();
    nodes.forEach((node) => {
      node.nodeValue = '';
    });
    nodeIndex = 0;
    charIndex = 0;
    pausedUntil = 0;
    park(caret, nodes[0]);
  }

  function play(): void {
    blank();
    raf = requestAnimationFrame(step);
  }

  return { blank, play, reveal, cancel };
}
