export function date(value: string) {
  const [day, month, year] = value.split('-')
  return new Date(Number(year), Number(month) - 1, Number(day))
}