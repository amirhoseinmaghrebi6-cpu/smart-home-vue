import { store } from '../store.js'

export function formatTemperature(celsiusValue) {
  const unit = store.tempUnit
  let displayValue = celsiusValue
  let symbol = '°C'

  if (unit === 'fahrenheit') {
    displayValue = (celsiusValue * 9/5) + 32
    symbol = '°F'
  } else if (unit === 'kelvin') {
    displayValue = celsiusValue + 273.15
    symbol = 'K'
  }

  return `${displayValue.toFixed(1)} ${symbol}`
}
