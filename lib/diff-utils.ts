import * as Diff from 'diff';

export function computeDiffStats(
  originalText: string,
  modifiedText: string,
  options: { ignoreWhitespace: boolean; ignoreCase: boolean }
) {
  const changes = Diff.diffLines(originalText, modifiedText, options);
  let addedLines = 0;
  let removedLines = 0;
  let unchangedLines = 0;
  let addedWords = 0;
  let removedWords = 0;
  let totalOriginalWords = 0;
  let totalModifiedWords = 0;

  changes.forEach(change => {
    const lines = (change.value ?? '').split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    const wordCounts = lines.map(line => line.trim().split(/\s+/).filter(Boolean).length);
    const totalWords = wordCounts.reduce((a, b) => a + b, 0);

    if (change.added) {
      addedLines += lines.length;
      addedWords += totalWords;
    } else if (change.removed) {
      removedLines += lines.length;
      removedWords += totalWords;
    } else {
      unchangedLines += lines.length;
    }

    if (!change.removed) totalModifiedWords += totalWords;
    if (!change.added) totalOriginalWords += totalWords;
  });

  const totalLines = addedLines + removedLines + unchangedLines;
  const changedLinesPercent = totalLines > 0 ? ((addedLines + removedLines) / totalLines * 100).toFixed(1) : '0';
  const similarity = (totalOriginalWords + totalModifiedWords) > 0
    ? (100 - ((addedWords + removedWords) / (totalOriginalWords + totalModifiedWords) * 100)).toFixed(1)
    : '100';

  return {
    addedLines,
    removedLines,
    unchangedLines,
    addedWords,
    removedWords,
    totalLines,
    changedLinesPercent,
    similarity,
  };
}

export function generateMergedText(
  rows: any[],
  decisions: Map<number, 'left' | 'right' | 'both' | 'discard'>
): string {
  let merged = '';
  rows.forEach((row, idx) => {
    const decision = decisions.get(idx);
    const leftText = row.left.tokens.map((t: any) => t.value).join('');
    const rightText = row.right.tokens.map((t: any) => t.value).join('');

    if (row.left.type === 'unchanged' && row.right.type === 'unchanged') {
      merged += leftText + '\n';
    } else {
      switch (decision) {
        case 'left':
          merged += leftText + '\n';
          break;
        case 'right':
          merged += rightText + '\n';
          break;
        case 'both':
          merged += leftText + '\n' + rightText + '\n';
          break;
        case 'discard':
          break;
        default:
          // default to original text (left) for removed, or right for added
          if (row.left.type === 'removed') merged += leftText + '\n';
          else if (row.right.type === 'added') merged += rightText + '\n';
          break;
      }
    }
  });
  return merged.trimEnd();
}