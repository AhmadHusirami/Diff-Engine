import { Row } from '@/components/diff/diff-viewer';

export function generateStyledHTML(rows: Row[], colors: any): string {
  const lines = rows.map(row => {
    const leftText = row.left.tokens.map(t => t.value).join('');
    const rightText = row.right.tokens.map(t => t.value).join('');
    let style = '';
    if (row.left.type === 'removed') style = `background:${colors.removedBg};color:${colors.removedText}`;
    if (row.right.type === 'added') style = `background:${colors.addedBg};color:${colors.addedText}`;
    return `<div style="font-family:monospace;white-space:pre-wrap;${style}">${escapeHtml(leftText || rightText)}</div>`;
  }).join('');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Diff</title></head><body>${lines}</body></html>`;
}

function escapeHtml(text: string) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function generateMarkdownDiff(rows: Row[]): string {
  let md = '```diff\n';
  rows.forEach(row => {
    if (row.left.type === 'removed') md += `- ${row.left.tokens.map(t => t.value).join('')}\n`;
    if (row.right.type === 'added') md += `+ ${row.right.tokens.map(t => t.value).join('')}\n`;
    if (row.left.type === 'unchanged') md += `  ${row.left.tokens.map(t => t.value).join('')}\n`;
  });
  md += '```';
  return md;
}