export interface Section {
  id: string;
  num: string;
  label: string;
  sub: string;
}

export const SECTIONS: Section[] = [
  { id: "hero", num: "01", label: "hero", sub: "install command" },
  { id: "choices", num: "02", label: "choices", sub: "declared stack" },
  { id: "configure", num: "03", label: "configure", sub: "compose modules" },
  { id: "modules", num: "04", label: "modules", sub: "table" },
  { id: "seams", num: "05", label: "seams", sub: "composition" },
  { id: "tree", num: "06", label: "tree", sub: "generated structure" },
  { id: "add", num: "07", label: "add", sub: "subcommand" },
  { id: "idempotency", num: "08", label: "idempotency", sub: "contract" },
];
