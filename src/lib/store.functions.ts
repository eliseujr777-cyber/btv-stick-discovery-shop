import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { isValidCPF, onlyDigits } from "./format";

export type Product = {
  id: string;
  slug: string;
  name: string;
  tag: string;
  price_cents: number;
  max_installments: number;
  features: string[];
  is_featured: boolean;
  image_url: string | null;
};

function publicClient() {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listProducts = createServerFn({ method: "GET" }).handler(async (): Promise<Product[]> => {
  const { data, error } = await publicClient()
    .from("products")
    .select("id, slug, name, tag, price_cents, max_installments, features, is_featured, image_url")
    .eq("active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error("Não foi possível carregar os produtos.");
  return data ?? [];
});

const orderSchema = z.object({
  customer: z.object({
    fullName: z.string().trim().min(3).max(120),
    cpf: z.string().refine(isValidCPF, "CPF inválido"),
    phone: z.string().refine((v) => [10, 11].includes(onlyDigits(v).length), "Telefone inválido"),
    email: z.string().trim().email().max(160),
  }),
  address: z.object({
    cep: z.string().refine((v) => onlyDigits(v).length === 8, "CEP inválido"),
    street: z.string().trim().min(2).max(160),
    number: z.string().trim().min(1).max(20),
    complement: z.string().trim().max(80).optional().default(""),
    neighborhood: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80),
    state: z.string().trim().length(2),
  }),
  items: z
    .array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(10) }))
    .min(1)
    .max(10),
});

export type OrderInput = z.input<typeof orderSchema>;

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => orderSchema.parse(input))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Preços sempre vêm do banco, nunca do navegador.
    const ids = [...new Set(data.items.map((i) => i.productId))];
    const { data: products, error: pErr } = await supabaseAdmin
      .from("products")
      .select("id, name, price_cents")
      .in("id", ids)
      .eq("active", true);
    if (pErr || !products || products.length !== ids.length) {
      throw new Error("Um dos produtos não está mais disponível.");
    }
    const byId = new Map(products.map((p) => [p.id, p]));
    const lines = data.items.map((i) => {
      const p = byId.get(i.productId)!;
      return {
        product_id: p.id,
        product_name: p.name,
        unit_price_cents: p.price_cents,
        quantity: i.quantity,
        line_total_cents: p.price_cents * i.quantity,
      };
    });
    const subtotal = lines.reduce((s, l) => s + l.line_total_cents, 0);
    const shipping = 0; // frete grátis para todo o Brasil

    const { data: customer, error: cErr } = await supabaseAdmin
      .from("customers")
      .upsert(
        {
          full_name: data.customer.fullName,
          cpf: onlyDigits(data.customer.cpf),
          phone: onlyDigits(data.customer.phone),
          email: data.customer.email.toLowerCase(),
        },
        { onConflict: "cpf" },
      )
      .select("id")
      .single();
    if (cErr || !customer) throw new Error("Não foi possível salvar seus dados.");

    const { data: order, error: oErr } = await supabaseAdmin
      .from("orders")
      .insert({
        customer_id: customer.id,
        subtotal_cents: subtotal,
        shipping_cents: shipping,
        total_cents: subtotal + shipping,
        payment_method: "whatsapp",
        cep: onlyDigits(data.address.cep),
        street: data.address.street,
        number: data.address.number,
        complement: data.address.complement || null,
        neighborhood: data.address.neighborhood,
        city: data.address.city,
        state: data.address.state.toUpperCase(),
      })
      .select("id, order_number, total_cents")
      .single();
    if (oErr || !order) throw new Error("Não foi possível registrar o pedido.");

    const { error: iErr } = await supabaseAdmin
      .from("order_items")
      .insert(lines.map((l) => ({ ...l, order_id: order.id })));
    if (iErr) {
      await supabaseAdmin.from("orders").delete().eq("id", order.id);
      throw new Error("Não foi possível registrar os itens do pedido.");
    }

    return {
      orderNumber: order.order_number,
      totalCents: order.total_cents,
      lines: lines.map((l) => ({ name: l.product_name, quantity: l.quantity, totalCents: l.line_total_cents })),
    };
  });
