/**
 * Phone numbers are free text the HR team types in, so we accept the usual ways of writing one
 * (+91 98765 43210, 0495-2765432, (0495) 276 5432) and keep what was typed, tidied.
 * Valid = only digits, spaces, + ( ) - and 7 to 15 digits (the E.164 maximum).
 * Empty is valid and means "no phone number".
 */
export type PhoneResult = { ok: true; value: string } | { ok: false; error: string }

export const PHONE_ERROR = 'Enter a valid phone number (7 to 15 digits; + ( ) - and spaces are fine)'

/**
 * The digits-only international number WhatsApp needs (e.g. "919876543210"), or null if the
 * stored number can't be turned into one. A number without a country code is taken to be local
 * to `defaultCountryCode` (India, 91, unless told otherwise); a single leading 0 is dropped.
 */
export function toWhatsAppNumber(raw: unknown, defaultCountryCode = '91'): string | null {
  const phone = normalizePhone(raw)
  if (!phone.ok || !phone.value) return null
  const international = phone.value.startsWith('+') || phone.value.replace(/[^\d+]/g, '').startsWith('00')
  let digits = phone.value.replace(/\D/g, '')
  if (international) {
    if (digits.startsWith('00')) digits = digits.slice(2)
  } else {
    digits = digits.replace(/^0/, '')
    if (digits.length <= 10) digits = defaultCountryCode + digits
  }
  return digits.length >= 10 && digits.length <= 15 ? digits : null
}

export function normalizePhone(raw: unknown): PhoneResult {
  if (raw === null || raw === undefined) return { ok: true, value: '' }
  if (typeof raw !== 'string') return { ok: false, error: PHONE_ERROR }
  const value = raw.trim().replace(/\s+/g, ' ')
  if (value === '') return { ok: true, value: '' }
  if (!/^\+?[\d\s()-]+$/.test(value)) return { ok: false, error: PHONE_ERROR }
  const digits = value.replace(/\D/g, '').length
  if (digits < 7 || digits > 15) return { ok: false, error: PHONE_ERROR }
  return { ok: true, value }
}
