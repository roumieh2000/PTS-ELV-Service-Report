import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import type { ServiceReport } from '@/types/report'
import { log } from '@/lib/logger'

function buildPdfHtml(report: ServiceReport): string {
  const statusColors: Record<string, string> = {
    Resolved: '#059669',
    Pending: '#d97706',
    Escalated: '#dc2626',
    Partial: '#2563eb',
  }
  const statusBg: Record<string, string> = {
    Resolved: '#d1fae5',
    Pending: '#fef3c7',
    Escalated: '#fee2e2',
    Partial: '#dbeafe',
  }

  const docFields = [
    { key: 'passwordRecords', label: 'Password Records' },
    { key: 'deliveryNotes', label: 'Delivery Notes' },
    { key: 'configuration', label: 'Configuration' },
    { key: 'rentMaterial', label: 'Rent Material' },
    { key: 'others', label: 'Others' },
  ] as const

  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto; padding: 40px; color: #1a1a1a;">
      <div style="text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px;">
        <h1 style="font-size: 22px; margin: 0; color: #2563eb;">ELV Service Report</h1>
      </div>

      <div style="margin-bottom: 16px;">
        <span style="font-size: 16px; font-weight: bold;">${report.docRef}</span>
        <span style="display: inline-block; margin-left: 10px; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; background: ${statusBg[report.resolutionStatus]}; color: ${statusColors[report.resolutionStatus]};">${report.resolutionStatus}</span>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
        <tr><td style="padding: 6px 0; color: #666; width: 140px;">Date</td><td style="padding: 6px 0; font-weight: 500;">${report.date}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">LPO / Contract Ref</td><td style="padding: 6px 0; font-weight: 500;">${report.lpoContractRef}</td></tr>
        <tr><td style="padding: 6px 0; color: #666;">TXN</td><td style="padding: 6px 0; font-weight: 500;">${report.txn}</td></tr>
      </table>

      <h3 style="font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">Client & Project</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr><td style="padding: 4px 0; color: #666; width: 140px;">Client Name</td><td style="padding: 4px 0; font-weight: 500;">${report.clientName}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Project Name</td><td style="padding: 4px 0; font-weight: 500;">${report.projectName}</td></tr>
      </table>

      <h3 style="font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">Type of Jobs</h3>
      <p style="margin: 0 0 16px;">${report.jobTypes.join(', ')}</p>

      <h3 style="font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">Complaints / Nature of Jobs</h3>
      <p style="margin: 0 0 16px; white-space: pre-wrap;">${report.complaints}</p>

      <h3 style="font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">Actions Taken</h3>
      <p style="margin: 0 0 16px; white-space: pre-wrap;">${report.actionsTaken}</p>

      <h3 style="font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">Sign-Off</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <tr>
          <td style="vertical-align: top; width: 50%; padding: 8px; border: 1px solid #e5e7eb;">
            <strong style="font-size: 12px;">Prog Tech</strong>
            ${report.progTechSignature ? `<div style="margin-top: 4px;"><img src="${report.progTechSignature}" style="height: 60px; max-width: 100%; object-fit: contain;" /></div>` : ''}
            <p style="margin: 6px 0 0; font-size: 13px;">${report.progTechName}</p>
            <p style="margin: 2px 0 0; font-size: 12px; color: #666;">${report.progTechDate}</p>
          </td>
          <td style="vertical-align: top; width: 50%; padding: 8px; border: 1px solid #e5e7eb;">
            <strong style="font-size: 12px;">Client</strong>
            ${report.clientSignature ? `<div style="margin-top: 4px;"><img src="${report.clientSignature}" style="height: 60px; max-width: 100%; object-fit: contain;" /></div>` : ''}
            <p style="margin: 6px 0 0; font-size: 13px;">${report.clientSignName}</p>
            <p style="margin: 2px 0 0; font-size: 12px; color: #666;">${report.clientSignDate}</p>
          </td>
        </tr>
      </table>

      <h3 style="font-size: 14px; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb;">Attached Documents</h3>
      <div style="display: flex; flex-wrap: wrap; gap: 8px;">
        ${docFields.map(({ key, label }) => `
          <div style="display: inline-flex; align-items: center; gap: 4px; margin-right: 16px; font-size: 13px;">
            <span style="color: ${report.documents[key] ? '#059669' : '#d1d5db'};">${report.documents[key] ? '✓' : '✗'}</span>
            ${label}
          </div>
        `).join('')}
      </div>
    </div>
  `
}

export async function generateReportPdf(report: ServiceReport): Promise<Blob> {
  const html = buildPdfHtml(report)
  const container = document.createElement('div')
  container.style.cssText = 'position:fixed;left:-9999px;top:0;z-index:-1;'
  container.innerHTML = html
  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, logging: false })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF('p', 'mm', 'a4')
    const pdfW = pdf.internal.pageSize.getWidth()
    const pdfH = (canvas.height * pdfW) / canvas.width
    let heightLeft = pdfH
    let position = 0
    const pageH = pdf.internal.pageSize.getHeight()

    pdf.addImage(imgData, 'PNG', 0, position, pdfW, pdfH)
    heightLeft -= pageH

    while (heightLeft > 0) {
      position -= pageH
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, pdfW, pdfH)
      heightLeft -= pageH
    }

    log('info', 'PDF generated', { docRef: report.docRef })
    return pdf.output('blob')
  } finally {
    document.body.removeChild(container)
  }
}
