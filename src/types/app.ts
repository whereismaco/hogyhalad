import type { Tenant } from "@/lib/access";
import type { Plan, PriceRule, Role } from "@/lib/domain";
export interface Snapshot {
  tenant: Omit<Tenant, "invoiceKey"> & {
    invoiceKeyConfigured: boolean;
    zip: string;
    city: string;
  };
  user: { id: string; name: string; email: string };
  role: Role;
  memberId: string;
  companies: { id: string; name: string; role: Role }[];
  canWrite: boolean;
  usage: {
    jobs: number;
    inquiries: number;
    seats: number;
    limits: {
      name: string;
      price: number;
      jobs: number;
      inquiries: number;
      seats: number;
      credits: number;
    };
  };
  counts: { total: number; paid: number; active: number };
  catalog: PriceRule[];
  members: {
    id: string;
    name: string;
    email: string;
    role: Role;
    active: number;
  }[];
  tasks: {
    id: string;
    type: string;
    state: string;
    attempts: number;
    lastError: string | null;
    result: string | null;
    createdAt: number;
  }[];
}
export type { Plan };
