export type Palette = "cyber" | "blue" | "noel" | "araw" | "festival";
export type SaleScope = "all" | "selected";

export type ColorOption = { value: string; label: string; hex: string; image?: string | null };
export type TextureOption = { value: string; label: string };
export type ProductImage = { id: number; path: string; sort_order: number };

export type Product = {
  id: number;
  sort_order: number;
  name: string;
  price: number;
  category: string;
  description: string;
  cover_image: string | null;
  colors: ColorOption[];
  textures: TextureOption[];
  sale_selected: boolean;
  is_active: boolean;
  images: ProductImage[];
};

export type Settings = {
  site_palette: Palette;
  sale_mode: boolean;
  sale_discount: number;
  sale_scope: SaleScope;
};

export type Category = { id: number; name: string };

export type OrderStatus = "received" | "processing" | "printing" | "ready" | "shipped" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "paid" | "failed" | "expired" | "refunded" | "offline";
export type CustomStatus = "new" | "contacted" | "quoted" | "approved" | "in_progress" | "completed" | "cancelled";
export type CustomPaymentStatus = "unpaid" | PaymentStatus;

export type Order = {
  id: number;
  order_ticket: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  status: OrderStatus;
  status_notes: string | null;
  payment_status: PaymentStatus;
  subtotal_price: number;
  discount_amount: number;
  discount_percentage: number;
  total_price: number;
  paid_at: string | null;
  created_at: string;
};

export type OrderItem = {
  id: number;
  order_id: number;
  product_id: number | null;
  product_name: string;
  product_image: string | null;
  sticker_color: string;
  color_label: string;
  sticker_texture: string;
  texture_label: string;
  unit_price: number;
  final_unit_price: number;
  discount_percentage: number;
  quantity: number;
};

export type CustomOrder = {
  id: number;
  customer_name: string;
  email: string;
  phone: string;
  social_handle: string;
  preferred_contact: "email" | "phone" | "social" | "any";
  description: string;
  image_path: string | null;
  size: string;
  status: CustomStatus;
  admin_notes: string | null;
  quoted_price: number | null;
  is_featured: boolean;
  pay_token: string;
  payment_status: CustomPaymentStatus;
  paid_at: string | null;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = { id: number; name: string; email: string; message: string; archived_at: string | null; created_at: string };

/** Cart line stored in the browser. Prices are NEVER stored here; the server recalculates them. */
export type CartLine = { key: string; productId: number; color: string; texture: string; quantity: number };

export type ActionState = { ok: boolean; message: string; errors?: string[] };
