/** Split this model's thinking-enabled stream; the prompt may already include <think>.
 * Parse accumulated text so a delimiter split across network chunks is unambiguous.
 * Hold incomplete delimiter suffixes until the following chunk arrives.
 */
export function splitReasoning(text) {
  let content = text.replace(/^\s*<think>\n?/, '');
  const boundary = content.indexOf('</think>');
  if (boundary >= 0) {
    return {thinking: content.slice(0, boundary).trimEnd(), answer: content.slice(boundary + 8).replace(/^\n+/, '')};
  }
  for (const marker of ['<think>', '</think>']) {
    for (let length = marker.length - 1; length > 0; length--) {
      if (content.endsWith(marker.slice(0, length))) {
        content = content.slice(0, -length);
        break;
      }
    }
  }
  return {thinking: content, answer: null};
}
