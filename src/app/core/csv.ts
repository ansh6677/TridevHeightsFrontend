/**
 * Turns rows into a CSV file and hands it to the browser.
 *
 * Everything is quoted and inner quotes are doubled, which is what keeps a
 * remark like `Paid "extra", see note` from splitting into three columns when
 * Excel opens it. The BOM matters too: without it Excel on Windows mangles any
 * non-ASCII character in a name.
 */
export function downloadCsv(fileName: string, headers: string[], rows: unknown[][]): void {
  const escape = (cell: unknown): string => {
    const text = cell === null || cell === undefined ? '' : String(cell);
    return `"${text.replace(/"/g, '""')}"`;
  };

  const csv = [headers, ...rows]
    .map((line) => line.map(escape).join(','))
    .join('\r\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();

  URL.revokeObjectURL(url);
}

/** `TridevHeights-Expenses_2026-08.csv` — same shape for every export. */
export function csvName(what: string, scope?: string): string {
  const stamp = scope && scope.trim() ? scope.trim() : 'all';
  return `TridevHeights-${what}_${stamp}.csv`;
}
