export const DELIVERY_MODES = [
  { value: "deliver", label: "I deliver" },
  { value: "3rd party service", label: "Third-party delivery service" },
]

export function normalizeDeliveryModes(value) {
  const values = Array.isArray(value) ? value : value ? [value] : []
  return DELIVERY_MODES
    .filter(({ value: mode }) => values.some((selected) => (
      selected === mode
      || (mode === "deliver" && selected === "I deliver")
      || (mode === "3rd party service" && ["Third-party delivery service", "Third-party courier"].includes(selected))
    )))
    .map(({ value: mode }) => mode)
}

export function formatDeliveryModes(value) {
  const modes = normalizeDeliveryModes(value)
  return DELIVERY_MODES
    .filter(({ value: mode }) => modes.includes(mode))
    .map(({ label }) => label)
    .join(", ")
}
