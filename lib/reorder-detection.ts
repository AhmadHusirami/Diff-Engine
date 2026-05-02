import { Row } from '@/components/diff/diff-viewer';

export function detectMovedBlocks(rows: Row[]): Row[] {
  if (rows.length < 5) return rows;
  const newRows = rows.map(row => ({ ...row, left: { ...row.left }, right: { ...row.right } }));

  const leftLines = newRows.map(r => r.left.tokens.map(t => t.value).join(''));
  const rightLines = newRows.map(r => r.right.tokens.map(t => t.value).join(''));

  const leftMap = new Map<string, number[]>();
  const rightMap = new Map<string, number[]>();

  leftLines.forEach((line, i) => {
    if (!leftMap.has(line)) leftMap.set(line, []);
    leftMap.get(line)!.push(i);
  });
  rightLines.forEach((line, i) => {
    if (!rightMap.has(line)) rightMap.set(line, []);
    rightMap.get(line)!.push(i);
  });

  newRows.forEach((row, idx) => {
    const left = leftLines[idx];
    const right = rightLines[idx];
    if (left && rightMap.has(left) && !rightMap.get(left)!.includes(idx)) {
      row.left.moved = true;
    }
    if (right && leftMap.has(right) && !leftMap.get(right)!.includes(idx)) {
      row.right.moved = true;
    }
  });

  return newRows;
}