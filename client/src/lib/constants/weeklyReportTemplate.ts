/**
 * Body of the WhatsApp message template the weekly report is sent with. Create a template with
 * exactly this text (category Utility) in WhatsApp Manager and put its name in
 * WHATSAPP_TEMPLATE_NAME. {{1}} = faculty name, {{2}} = period, {{3}} = summary.
 */
export const REPORT_TEMPLATE_BODY =
  'Hello {{1}}, here is your DOPA Coaching class report for {{2}}.\n\n{{3}}\n\nIf anything looks wrong, please contact the HR team.'

export function renderReportMessage(params: [string, string, string]): string {
  return REPORT_TEMPLATE_BODY.replace(/\{\{(\d)\}\}/g, (_, n: string) => params[Number(n) - 1] ?? '')
}
