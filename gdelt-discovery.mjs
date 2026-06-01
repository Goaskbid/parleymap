export const officialCalendarConnector = {
  id: "official-calendars",
  label: "Official calendars and public schedules",
  priority: "primary",
  cadence: "nightly",
  notes: "Connector placeholder. Production implementation should respect robots.txt, provider terms, rate limits, source timestamps, and correction notices.",
  async discover() {
    return [];
  }
};
