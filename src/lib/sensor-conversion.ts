export type SensorConversionConfig = {
  rowValueConversion: boolean;
  minAnalogue: number;
  maxAnalogue: number;
  minToConvertValue: number;
  maxToConvertValue: number;
};

export type ReadingValue = { value: number; rawValue?: number | null };

// Map a raw analogue reading linearly from [minAnalogue, maxAnalogue]
// to [minToConvertValue, maxToConvertValue].
// Example: raw 0–1023 → 0–100 % (moisture) or 0–60 °C (temperature)
export function convertRawToPhysical(
  raw: number,
  minAnalogue: number,
  maxAnalogue: number,
  minToConvertValue: number,
  maxToConvertValue: number
): number {
  const spanIn = maxAnalogue - minAnalogue;
  if (spanIn <= 0) return minToConvertValue;
  const clamped = Math.min(Math.max(raw, minAnalogue), maxAnalogue);
  const ratio = (clamped - minAnalogue) / spanIn;
  return minToConvertValue + ratio * (maxToConvertValue - minToConvertValue);
}

// Resolve the display value for a reading:
//  - rowValueConversion on  → convert the raw ADC through both ranges
//  - otherwise              → use the value as published by the MCU
export function resolveSensorValue(
  reading: ReadingValue | null | undefined,
  sensor: SensorConversionConfig
): number | null {
  if (!reading) return null;
  if (sensor.rowValueConversion && reading.rawValue != null) {
    return convertRawToPhysical(
      reading.rawValue,
      sensor.minAnalogue,
      sensor.maxAnalogue,
      sensor.minToConvertValue,
      sensor.maxToConvertValue
    );
  }
  return reading.value;
}