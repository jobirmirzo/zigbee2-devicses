// Plausible demo values so cards look alive without a live MQTT connection.

const PRESETS = {
  temperature: 21.4,
  local_temperature: 21.4,
  device_temperature: 34,
  humidity: 47,
  pressure: 1013,
  illuminance: 320,
  co2: 640,
  voc: 112,
  pm25: 8,
  soil_moisture: 33,
  battery: 87,
  voltage: 229,
  current: 0.42,
  power: 12.6,
  energy: 34.2,
  ac_frequency: 50,
  linkquality: 96,
  occupied_heating_setpoint: 21,
  current_heating_setpoint: 21,
  position: 65,
  brightness: 180,
  color_temp: 350,
};

export function demoValue(expose) {
  const base = expose.base ?? expose.property ?? "";
  if (base in PRESETS) return PRESETS[base];
  switch (expose.type) {
    case "binary":
      return false;
    case "numeric": {
      const { value_min: lo, value_max: hi } = expose;
      if (lo !== undefined && hi !== undefined) return Math.round((lo + hi) / 2);
      return 0;
    }
    case "enum":
      return expose.values?.[0] ?? "";
    case "text":
      return "";
    default:
      return null;
  }
}

// same for a grouped expose's sub-feature
export const demoFeature = (f) => demoValue(f);
