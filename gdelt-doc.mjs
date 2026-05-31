export const visualAuditConnector = {
  id: "visual-audit",
  label: "Commons and public-domain visual audit",
  priority: "media-compliance",
  cadence: "weekly",
  requiredFields: ["sourceUrl", "author", "license", "attributionText", "licenseUrl", "checkedAt"],
  async discover() {
    return [];
  }
};
