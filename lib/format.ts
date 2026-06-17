export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

export function formatHours(value: number | null) {
  if (value === null) {
    return "N/A";
  }

  return `${value.toFixed(1)}h`;
}
