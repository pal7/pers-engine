export const formatPercent = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value)

export const formatSignedPercent = (value: number) =>
  `${value >= 0 ? '+' : ''}${new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value)}`

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

export const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US').format(value)
