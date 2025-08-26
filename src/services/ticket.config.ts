type SearchColumns = Record<string, number>

export const SearchColumns = {
  id: 2,
  searchName: 3,
  description: 4,
  p: 5,
  pi: 6,
  s: 7,
  as: 8,
  plannedFrom: 9,
  plannedUntil: 10,
  deadline: 11,
  updatedAt: 12,
  age: 13,
  eig: 14,
  hv: 15,
  involved: 16
} as const satisfies SearchColumns