import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const css = fs.readFileSync(path.join(root, "src", "styles.css"), "utf8");
const js = fs.readFileSync(path.join(root, "src", "app.js"), "utf8");
const data = fs.readFileSync(path.join(root, "data", "demo.json"), "utf8");
const logoBytes = fs.readFileSync(path.join(root, "assets", "parleymap-logo-transparent.png"));
const logoDataUri = `data:image/png;base64,${logoBytes.toString("base64")}`;
const template = fs.readFileSync(path.join(root, "templates", "index.template.html"), "utf8");
const html = template
  .replace("__INLINE_CSS__", css.replaceAll("</style", "<\\/style"))
  .replace("__INLINE_DATA__", data.replaceAll("</script", "<\\/script"))
  .replaceAll("__LOGO_DATA_URI__", logoDataUri)
  .replace("__INLINE_JS__", js.replaceAll("</script", "<\\/script"));
fs.writeFileSync(path.join(root, "index.html"), html);
console.log("Built index.html");
