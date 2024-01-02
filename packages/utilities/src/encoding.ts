export function testPath(pattern: string, path?: string | null) {
  const tmpls = pattern.split("/");
  const parts = (path || "").split("/");
  const params: { [key: string]: string } = {};
  let isWildcard = false;

  for (let i = 1; i < tmpls.length; i++) {
    const tmpl = tmpls[i];
    const part = parts[i];
    isWildcard = isWildcard || tmpl === "*";
    const isParam = tmpl.slice(0, 1) === ":";
    const isOptional = tmpl.slice(-1) === "?";
    const paramName = tmpl.replace(/[:?]/g, "");
    if (isWildcard) {
    } else if (!isParam) {
      if (part !== tmpl) return false;
    } else if (isParam && !isOptional) {
      if (!part) return;
      params[paramName] = part;
    } else if (isParam && isOptional) {
      params[paramName] = part;
    }
  }

  return params;
}
