/** "aujourd'hui", "hier", "il y a 3 jours"... a partir d'une date ISO. */
export function relativeDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / 86_400_000)
  if (days <= 0) return "aujourd'hui"
  if (days === 1) return 'hier'
  if (days < 30) return `il y a ${days} jours`
  const months = Math.floor(days / 30)
  return months === 1 ? 'il y a 1 mois' : `il y a ${months} mois`
}
