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
<template>
  <span class="temp-display">{{ formatTemperature(sensorValue) }}</span>
</template>

<script setup>
import { formatTemperature } from '../utils/tempConverter.js'
const sensorValue = ref(24.5) // مقدار خام از ESP32 همیشه سلسیوس است
</script>