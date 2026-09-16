export type SubscriptionPlan = "STARTER" | "BUSINESS" | "ENTERPRISE";

export type JobStatus = 
  | "WAITING_PICKUP"   // Felvételre vár
  | "RECEIVED"         // Beérkezett
  | "IN_PROGRESS"      // Tisztítás alatt
  | "COMPLETED"        // Elkészült (kiszállításra vár)
  | "DELIVERED"        // Kiszállítva / Lezárt
  | "ARCHIVED";        // Archivált

export type PickupMode = "QUICK_COUNT" | "FIELD_MEASURED";

export type PaymentMethod = "CASH" | "CARD_POS" | "TRANSFER" | "ONLINE";
export type PaymentStatus = "PENDING" | "PAID";

export interface RugItem {
  id: string;
  name: string;             // pl. "Perzsa gyapjú szőnyeg"
  width: number;            // méter
  length: number;           // méter
  area: number;             // m2 (width * length)
  basePricePerM2: number;   // Ft / m2
  isHeavySoiling: boolean;  // Erős szennyezettség
  heavySoilingFee: number;  // Ft felár
  extras: string[];         // pl. ["Atkamentesítés", "Ózonos szagtalanítás"]
  extrasFee: number;        // Ft
  totalPrice: number;       // Ft
  tagQrCode?: string;       // Műhelyi vízálló biléta kód
  photos?: string[];
  notes?: string;
}

export interface Job {
  id: string;
  jobCode: string;          // pl. "CF-2026-0042"
  status: JobStatus;
  pickupMode: PickupMode;
  quickRugCount?: number;   // Ha darabszámos az átvétel
  
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  customerNotes?: string;
  
  scheduledPickup?: string;
  scheduledDelivery?: string;
  assignedDriver?: string;  // pl. "Péter (1-es furgon)"
  
  items: RugItem[];
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  
  trackingToken: string;
  customerSignature?: string; // Data URL
  signedAt?: string;
  
  invoiceNumber?: string;
  invoicePdfUrl?: string;
  internalNotes?: string;
  createdAt: string;
}

export interface Inquiry {
  id: string;
  source: "WEB_WIDGET" | "EMAIL" | "PHONE" | "MANUAL";
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress: string;
  customerNotes?: string;
  estimatedAmount?: number;
  itemsPreview?: string;
  preferredDate?: string;
  status: "NEW" | "OFFER_SENT" | "CONVERTED" | "DECLINED";
  aiSummary?: string;
  aiDraftReply?: string;
  createdAt: string;
}

export interface TenantSettings {
  id: string;
  name: string;
  slug: string;
  plan: SubscriptionPlan;
  monthlyJobsCount: number;
  maxMonthlyJobs: number;
  monthlyLeadsCount: number;
  maxMonthlyLeads: number;
  seatsCount: number;
  maxSeats: number;
  aiCredits: number;
  autoAiResponse: boolean;
  phone: string;
  email: string;
  address: string;
  googleReviewUrl?: string;
  facebookReviewUrl?: string;
  invoiceProvider: "MANUAL" | "SZAMLAZZ" | "BILLINGO";
}
