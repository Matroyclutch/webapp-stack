export interface Env {
  RESEND_API_KEY: string
  MAIL_TO: string
  RESEND_FROM?: string
}

const RESEND_URL = 'https://api.resend.com/emails'

function base64Encode(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export async function onRequestPost({ request, env }: { request: Request; env: Env }) {
  if (!env.RESEND_API_KEY) {
    return new Response(JSON.stringify({ status: 'error', message: 'RESEND_API_KEY missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!env.MAIL_TO) {
    return new Response(JSON.stringify({ status: 'error', message: 'MAIL_TO missing' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const form = await request.formData()
  const dealerName = form.get('dealerName')?.toString() || ''
  const dealerAcct = form.get('dealerAcct')?.toString() || ''
  const contactName = form.get('contactName')?.toString() || ''
  const contactEmail = form.get('contactEmail')?.toString() || ''
  const contactPhone = form.get('contactPhone')?.toString() || ''
  const vin = form.get('vin')?.toString() || ''
  const stockNumber = form.get('stockNumber')?.toString() || ''
  const purchaseDate = form.get('purchaseDate')?.toString() || ''
  const pickupDate = form.get('pickupDate')?.toString() || ''
  const odometerReading = form.get('odometerReading')?.toString() || ''
  const salePrice = form.get('salePrice')?.toString() || ''
  const claimType = form.get('claimType')?.toString() || ''
  const defectArea = form.get('defectArea')?.toString() || ''
  const repairCost = form.get('repairCost')?.toString() || ''
  const defectDescription = form.get('defectDescription')?.toString() || ''
  const signature = form.get('signature')?.toString() || ''

  const body = [
    'Clutch Arbitration Request',
    '',
    `Dealer Name: ${dealerName}`,
    `Dealer Account #: ${dealerAcct}`,
    `Primary Contact: ${contactName}`,
    `Contact Email: ${contactEmail}`,
    `Contact Phone: ${contactPhone}`,
    '',
    `VIN: ${vin}`,
    `Stock/Lot #: ${stockNumber}`,
    `Purchase Date: ${purchaseDate}`,
    `Pickup Date: ${pickupDate}`,
    `Odometer: ${odometerReading}`,
    `Sale Price: ${salePrice}`,
    '',
    `Claim Type: ${claimType}`,
    `Defect Area: ${defectArea}`,
    `Repair Cost: ${repairCost}`,
    'Description:',
    defectDescription,
    '',
    `Signature: ${signature}`,
  ].join('\n')

  const attachments: Array<{ filename: string; content: string; content_type: string }> = []
  const fileList = form.getAll('files')
  for (const f of fileList) {
    if (f instanceof File) {
      const buf = await f.arrayBuffer()
      attachments.push({
        filename: f.name || 'attachment',
        content: base64Encode(buf),
        content_type: f.type || 'application/octet-stream',
      })
    }
  }

  const payload = {
    from: env.RESEND_FROM || 'onboarding@resend.dev',
    to: [env.MAIL_TO],
    subject: `Arbitration Request - ${dealerName || 'Unknown'} - ${vin || 'N/A'}`,
    text: body,
    attachments,
  }

  const resp = await fetch(RESEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!resp.ok) {
    const text = await resp.text()
    return new Response(JSON.stringify({ status: 'error', message: text }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
