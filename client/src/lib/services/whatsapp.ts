/**
 * WhatsApp Business (Meta Cloud API) sender. A business can only start a conversation with an
 * approved message template, so the weekly report goes out as a template with three body
 * variables: {{1}} faculty name, {{2}} period, {{3}} summary. See DEPLOYMENT.md for the template text.
 *
 * Env: WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_TEMPLATE_NAME,
 *      WHATSAPP_TEMPLATE_LANG (default "en"), WHATSAPP_DEFAULT_COUNTRY_CODE (default "91").
 */
const GRAPH_VERSION = 'v21.0'

export type WhatsAppResult = { ok: true; messageId: string } | { ok: false; error: string }

export function whatsappConfigured(): boolean {
  return !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_TEMPLATE_NAME)
}

export function defaultCountryCode(): string {
  return (process.env.WHATSAPP_DEFAULT_COUNTRY_CODE ?? '91').replace(/\D/g, '') || '91'
}

/** Template variables may not hold newlines, tabs or long runs of spaces. */
function cleanParam(text: string): string {
  return text.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim().slice(0, 1000)
}

export async function sendReportTemplate(to: string, params: string[]): Promise<WhatsAppResult> {
  if (!whatsappConfigured()) return { ok: false, error: 'WhatsApp is not configured on the server' }
  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: process.env.WHATSAPP_TEMPLATE_NAME,
          language: { code: process.env.WHATSAPP_TEMPLATE_LANG || 'en' },
          components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: cleanParam(text) })) }],
        },
      }),
    })
    const body = await res.json().catch(() => ({})) as { messages?: { id: string }[]; error?: { message?: string } }
    if (!res.ok) return { ok: false, error: body.error?.message ?? `WhatsApp returned ${res.status}` }
    return { ok: true, messageId: body.messages?.[0]?.id ?? '' }
  } catch (err) {
    console.error('[whatsapp]', err)
    return { ok: false, error: 'Could not reach WhatsApp' }
  }
}
