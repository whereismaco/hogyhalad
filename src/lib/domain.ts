import { z } from "zod";
import Decimal from "decimal.js";

export const planNames = ["STARTER", "BUSINESS"] as const;
export type Plan = (typeof planNames)[number];
export const roles = [
  "OWNER",
  "ADMIN",
  "DISPATCHER",
  "DRIVER",
  "WORKER",
] as const;
export type Role = (typeof roles)[number];
export const plans = {
  STARTER: {
    name: "Starter",
    price: 29990,
    jobs: 200,
    inquiries: 300,
    seats: 1,
    credits: 30,
  },
  BUSINESS: {
    name: "Business",
    price: 49990,
    jobs: 1000,
    inquiries: 1500,
    seats: 5,
    credits: 100,
  },
} as const;
export const topups = {
  small: { credits: 250, price: 5000 },
  medium: { credits: 550, price: 10000 },
  large: { credits: 1200, price: 20000 },
} as const;
export const stageSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{1,40}$/),
  name: z.string().trim().min(1).max(80),
  kind: z.enum([
    "NEW",
    "RECEIVED",
    "IN_PROGRESS",
    "READY",
    "DELIVERY",
    "CLOSED",
  ]),
  public: z.boolean().default(true),
});
export const workflowSchema = z
  .array(stageSchema)
  .min(2)
  .max(15)
  .superRefine((steps, ctx) => {
    if (new Set(steps.map((s) => s.id)).size !== steps.length)
      ctx.addIssue({
        code: "custom",
        message: "A lépések azonosítója legyen egyedi.",
      });
    if (steps[0].kind !== "NEW" || steps.at(-1)?.kind !== "CLOSED")
      ctx.addIssue({
        code: "custom",
        message: "Az első lépés új, az utolsó lezárt típusú legyen.",
      });
  });
export type Stage = z.infer<typeof stageSchema>;
export const templates: Record<string, { name: string; stages: Stage[] }> =
  Object.fromEntries(
    [
      [
        "RUG",
        "Szőnyegtisztítás",
        [
          "Felvételre vár",
          "Beérkezett",
          "Tisztítás alatt",
          "Elkészült",
          "Kiszállítás alatt",
          "Átadva",
        ],
      ],
      [
        "UPHOLSTERY",
        "Kárpittisztítás",
        [
          "Megrendelve",
          "Egyeztetve",
          "Tisztítás alatt",
          "Elkészült",
          "Ellenőrzés",
          "Lezárva",
        ],
      ],
      [
        "CAR",
        "Autótisztítás",
        [
          "Időpontra vár",
          "Átvéve",
          "Tisztítás alatt",
          "Elkészült",
          "Átadásra vár",
          "Átadva",
        ],
      ],
      [
        "GENERAL",
        "Általános szolgáltatás",
        [
          "Megrendelve",
          "Átvéve",
          "Folyamatban",
          "Elkészült",
          "Átadásra vár",
          "Lezárva",
        ],
      ],
    ].map(([key, name, labels]) => [
      key,
      {
        name,
        stages: (labels as string[]).map((label, i) => ({
          id: ["new", "received", "progress", "ready", "delivery", "closed"][i],
          name: label,
          kind: (
            [
              "NEW",
              "RECEIVED",
              "IN_PROGRESS",
              "READY",
              "DELIVERY",
              "CLOSED",
            ] as const
          )[i],
          public: true,
        })),
      },
    ]),
  );
export const tenantSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .min(3)
    .max(48),
  email: z.email(),
  phone: z.string().trim().min(6).max(30),
  address: z.string().trim().max(300),
  taxNumber: z.string().trim().max(40),
  template: z.enum(["RUG", "UPHOLSTERY", "CAR", "GENERAL"]),
  zip: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(100),
});
export const customerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.union([z.email(), z.literal("")]).default(""),
  phone: z.string().trim().min(6).max(30),
  address: z.string().trim().max(300).default(""),
  taxNumber: z.string().trim().max(40).default(""),
  notes: z.string().trim().max(4000).default(""),
  zip: z.string().trim().max(20).default(""),
  city: z.string().trim().max(100).default(""),
});
export const priceRuleSchema = z.object({
  name: z.string().trim().min(2).max(120),
  unit: z.enum(["M2", "PIECE", "HOUR", "FIXED"]),
  unitPrice: z.number().int().min(0).max(100000000),
  isExtra: z.boolean().default(false),
  active: z.boolean().default(true),
});
export const itemInputSchema = z.object({
  ruleId: z.string().min(1),
  quantity: z.number().positive().max(100000).default(1),
  width: z.number().positive().max(100).optional(),
  length: z.number().positive().max(100).optional(),
  extras: z.array(z.string()).max(30).default([]),
});
export type PriceRule = z.infer<typeof priceRuleSchema> & { id: string };
export function calculateItem(
  input: z.infer<typeof itemInputSchema>,
  catalog: PriceRule[],
) {
  input = itemInputSchema.parse(input);
  const rule = catalog.find(
    (r) => r.id === input.ruleId && r.active && !r.isExtra,
  );
  if (!rule) throw new Error("A szolgáltatás nem elérhető.");
  let quantity = new Decimal(input.quantity);
  if (rule.unit === "M2") {
    if (!input.width || !input.length)
      throw new Error("Add meg a szélességet és a hosszúságot.");
    quantity = new Decimal(input.width).times(input.length).toDecimalPlaces(4);
  }
  if (rule.unit === "FIXED") quantity = new Decimal(1);
  const extras = [...new Set(input.extras)].map((id) => {
    const extra = catalog.find((r) => r.id === id && r.active && r.isExtra);
    if (!extra) throw new Error("Az extra nem elérhető.");
    if (
      (extra.unit === "M2" && rule.unit !== "M2") ||
      (extra.unit === "HOUR" && rule.unit !== "HOUR")
    )
      throw new Error(
        "Az extra egysége nem illik a kiválasztott szolgáltatáshoz.",
      );
    const extraQuantity =
      extra.unit === "FIXED"
        ? new Decimal(1)
        : extra.unit === rule.unit
          ? quantity
          : new Decimal(1);
    const amount = new Decimal(extra.unitPrice)
      .times(extraQuantity)
      .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
      .toNumber();
    return { ...extra, amount };
  });
  const base = quantity
    .times(rule.unitPrice)
    .toDecimalPlaces(0, Decimal.ROUND_HALF_UP)
    .toNumber();
  return {
    name: rule.name,
    unit: rule.unit,
    quantity: quantity.toNumber(),
    unitPrice: rule.unitPrice,
    width: input.width ?? null,
    length: input.length ?? null,
    extras,
    total: base + extras.reduce((sum, e) => sum + e.amount, 0),
  };
}
export function calculateTotal(amounts: number[], minimum: number) {
  return amounts.length
    ? Math.max(
        amounts.reduce((sum, n) => sum + n, 0),
        minimum,
      )
    : 0;
}
export function canWrite(
  state: string,
  pastDueAt: number | null,
  now = Date.now(),
  trialEnd: number | null = null,
  periodEnd: number | null = null,
) {
  if (state === "trialing" && trialEnd !== null && now >= trialEnd)
    return false;
  if (
    state === "active" &&
    periodEnd !== null &&
    now >= periodEnd + 3 * 86400000
  )
    return false;
  return (
    state === "active" ||
    state === "trialing" ||
    (state === "past_due" &&
      pastDueAt !== null &&
      now < pastDueAt + 3 * 86400000)
  );
}
export function budapestDate(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
export function money(amount: number) {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(amount);
}
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
