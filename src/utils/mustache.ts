/**
 * Tiny dependency-free mustache renderer.
 * Supports: {{key}}, {{#section}}...{{/section}}, {{^inverted}}...{{/inverted}}
 * Does NOT support: partials, lambdas, nested dots beyond one level.
 */
export function render(template: string, data: Record<string, unknown>): string {
  let result = template;

  // Replace {{#section}}...{{/section}} (truthy blocks)
  result = result.replace(
    /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, key: string, inner: string) => {
      const val = data[key];
      if (!val) return "";
      if (Array.isArray(val)) {
        return val
          .map((item) =>
            render(
              inner,
              typeof item === "object" && item !== null
                ? (item as Record<string, unknown>)
                : { ".": item },
            ),
          )
          .join("");
      }
      return render(inner, data);
    },
  );

  // Replace {{^inverted}}...{{/inverted}} (falsy blocks)
  result = result.replace(
    /\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g,
    (_, key: string, inner: string) => {
      const val = data[key];
      if (val) return "";
      return render(inner, data);
    },
  );

  // Replace {{key}} with escaped value
  result = result.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = data[key];
    if (val === undefined || val === null) return "";
    return String(val);
  });

  return result;
}
