import ExcelJS from 'exceljs'
import { supabase } from './_lib/supabase'
import { getQuery, json, methodNotAllowed, type VercelRequest, type VercelResponse } from './_lib/http'
import { quoteTotals, type QuoteItem, type QuoteTotals } from './_lib/tools'

export const maxDuration = 30

interface QuoteRow {
  id: string
  quote_ref: string
  client_name: string
  project_name: string
  prepared_by: string
  currency: string
  vat_percent: number
  discount: number
  notes: string
  items: QuoteItem[]
  totals: QuoteTotals | null
  created_at: string
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'GET') return methodNotAllowed(res)
  if (!supabase) {
    json(res, 500, { error: 'Supabase is not configured' })
    return
  }

  const id = getQuery(req, 'id')
  if (!id) {
    json(res, 400, { error: 'id query parameter is required' })
    return
  }

  const { data, error } = await supabase.from('quotes').select('*').eq('id', id).single()
  if (error || !data) {
    json(res, 404, { error: 'Quote not found' })
    return
  }

  const q = data as unknown as QuoteRow
  const items = Array.isArray(q.items) ? q.items : []
  const totals = q.totals ?? quoteTotals(items, Number(q.vat_percent) || 0, Number(q.discount) || 0, q.currency || 'AED')
  const company = process.env.QUOTE_COMPANY_NAME || 'ELV Services'

  const wb = new ExcelJS.Workbook()
  wb.creator = company
  wb.created = new Date(q.created_at)
  const ws = wb.addWorksheet('Quote', {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  })

  ws.columns = [
    { key: 'col1', width: 6 },
    { key: 'col2', width: 42 },
    { key: 'col3', width: 10 },
    { key: 'col4', width: 12 },
    { key: 'col5', width: 14 },
    { key: 'col6', width: 16 },
  ]

  const navy = 'FF1F3864'

  ws.mergeCells('A1:F1')
  const titleCell = ws.getCell('A1')
  titleCell.value = company
  titleCell.font = { bold: true, size: 18, color: { argb: navy } }
  titleCell.alignment = { vertical: 'middle' }
  ws.getRow(1).height = 28

  ws.mergeCells('A2:F2')
  ws.getCell('A2').value = 'QUOTATION'
  ws.getCell('A2').font = { bold: true, size: 12, color: { argb: 'FF555555' } }

  const meta: Array<[string, string]> = [
    ['Quote Ref', q.quote_ref],
    ['Date', String(q.created_at).slice(0, 10)],
    ['Client', q.client_name],
    ['Project', q.project_name || '-'],
    ['Prepared by', q.prepared_by || '-'],
  ]
  let r = 4
  for (const [label, value] of meta) {
    ws.getCell(r, 1).value = label
    ws.getCell(r, 1).font = { bold: true }
    ws.mergeCells(r, 2, r, 3)
    ws.getCell(r, 2).value = value
    r += 1
  }

  const headerRow = r + 1
  const headers = ['#', 'Description', 'Qty', 'Unit', 'Unit Price', 'Amount']
  headers.forEach((h, i) => {
    const cell = ws.getCell(headerRow, i + 1)
    cell.value = h
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } }
    cell.alignment = { vertical: 'middle', horizontal: i === 1 ? 'left' : 'center' }
  })
  ws.getRow(headerRow).height = 20

  let rowPtr = headerRow + 1
  items.forEach((item, idx) => {
    const amount = item.qty * item.unitPrice
    ws.getCell(rowPtr, 1).value = idx + 1
    ws.getCell(rowPtr, 2).value = item.description
    ws.getCell(rowPtr, 3).value = item.qty
    ws.getCell(rowPtr, 4).value = item.unit
    ws.getCell(rowPtr, 5).value = item.unitPrice
    ws.getCell(rowPtr, 6).value = amount
    for (let c = 1; c <= 6; c++) {
      const cell = ws.getCell(rowPtr, c)
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      }
      if (c >= 3) cell.alignment = { horizontal: 'center' }
      if (c === 2) cell.alignment = { wrapText: true, vertical: 'middle' }
    }
    ws.getCell(rowPtr, 5).numFmt = '#,##0.00'
    ws.getCell(rowPtr, 6).numFmt = '#,##0.00'
    if (idx % 2 === 1) {
      for (let c = 1; c <= 6; c++) {
        ws.getCell(rowPtr, c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F5FA' } }
      }
    }
    rowPtr += 1
  })

  rowPtr += 1
  const summary: Array<[string, number]> = [
    ['Subtotal', totals.subtotal],
  ]
  if (totals.discount > 0) summary.push(['Discount', -totals.discount])
  summary.push([`VAT (${q.vat_percent}%)`, totals.vat])
  for (const [label, value] of summary) {
    ws.mergeCells(rowPtr, 4, rowPtr, 5)
    ws.getCell(rowPtr, 4).value = label
    ws.getCell(rowPtr, 4).font = { bold: true }
    ws.getCell(rowPtr, 4).alignment = { horizontal: 'right' }
    ws.getCell(rowPtr, 6).value = value
    ws.getCell(rowPtr, 6).numFmt = '#,##0.00'
    rowPtr += 1
  }
  ws.mergeCells(rowPtr, 4, rowPtr, 5)
  const totalLabel = ws.getCell(rowPtr, 4)
  totalLabel.value = 'TOTAL'
  totalLabel.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
  totalLabel.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } }
  totalLabel.alignment = { horizontal: 'right' }
  const totalCell = ws.getCell(rowPtr, 6)
  totalCell.value = totals.total
  totalCell.numFmt = '#,##0.00'
  totalCell.font = { bold: true, size: 12, color: { argb: 'FFFFFFFF' } }
  totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: navy } }
  ws.getRow(rowPtr).height = 22
  rowPtr += 2

  ws.mergeCells(rowPtr, 1, rowPtr, 6)
  ws.getCell(rowPtr, 1).value = `Prices in ${totals.currency}.`
  ws.getCell(rowPtr, 1).font = { italic: true, size: 9, color: { argb: 'FF666666' } }
  rowPtr += 1
  if (q.notes) {
    ws.mergeCells(rowPtr, 1, rowPtr + 1, 6)
    const notesCell = ws.getCell(rowPtr, 1)
    notesCell.value = `Notes: ${q.notes}`
    notesCell.alignment = { wrapText: true, vertical: 'top' }
    notesCell.font = { size: 10 }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `${q.quote_ref}_${q.client_name.replace(/[^a-z0-9-_]+/gi, '_')}.xlsx`
  res.status(200)
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.send(buffer)
}
