export const sensorColors: Record<string, {
    color:  string
    label:  string
    unit:   string
  }> = {
    soil_moisture: { color: "#4CAF7D", label: "Humidité sol",    unit: "%" },
    temperature:   { color: "#E89B2D", label: "Température",     unit: "°C" },
    humidity:      { color: "#6BA3D6", label: "Humidité air",    unit: "%" },
    flow_rate:     { color: "#D95F5F", label: "Débit",           unit: "L/min" },
    airTemp:       { color: "#E89B2D", label: "Température air", unit: "°C" },
    airHumidity:   { color: "#6BA3D6", label: "Humidité air",    unit: "%" },
    soilMoisture:  { color: "#4CAF7D", label: "Humidité sol",    unit: "%" },
  }
  
  export function getSensorColor(sensorType: string | null) {
    return sensorColors[sensorType ?? ""] ?? {
      color: "#8FAF9A", label: sensorType ?? "Capteur", unit: ""
    }
  }