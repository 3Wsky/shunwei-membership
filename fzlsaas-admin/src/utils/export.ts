export interface ExportColumn<T = any> {
  label: string
  value: (row: T) => string | number | null | undefined
}

function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function timestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

/** 生成带 UTF-8 BOM 的 CSV 并触发浏览器下载（BOM 让 Excel 正确识别中文） */
export function exportToCsv<T>(filename: string, columns: ExportColumn<T>[], rows: T[]): void {
  const header = columns.map((c) => csvCell(c.label)).join(',')
  const body = rows.map((row) => columns.map((c) => csvCell(c.value(row))).join(',')).join('\r\n')
  const csv = `\uFEFF${header}\r\n${body}`
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${timestamp()}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * 翻页拉取服务端分页列表的全部数据（用于导出全部匹配结果，而非当前页）。
 * fetchPage 返回 { list, total }；按 total 或空页终止，maxRows 兜底防止失控。
 */
export async function fetchAllRows<T>(
  fetchPage: (page: number, pageSize: number) => Promise<{ list: T[]; total: number }>,
  pageSize = 200,
  maxRows = 100000
): Promise<T[]> {
  const all: T[] = []
  let page = 1
  for (;;) {
    const { list, total } = await fetchPage(page, pageSize)
    all.push(...list)
    if (!list.length || all.length >= total || all.length >= maxRows) break
    page += 1
  }
  return all
}
