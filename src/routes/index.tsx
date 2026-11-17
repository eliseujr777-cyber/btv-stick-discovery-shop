import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { Check, CreditCard, Headphones, ShieldCheck, ShoppingCart, Truck, Tv } from "lucide-react";
import { SiteHeader, Logo } from "@/components/store/SiteHeader";
import { CartSheet } from "@/components/store/CartSheet";
import { CheckoutDialog } from "@/components/store/CheckoutDialog";
import { WhatsAppIcon } from "@/components/store/WhatsAppIcon";
import { useCart } from "@/lib/cart";
import { listProducts, type Product } from "@/lib/store.functions";
import { formatBRL, installmentCents, WHATSAPP_DISPLAY, whatsappLink } from "@/lib/format";
import posterAsset from "@/assets/btv-stick-poster.png.asset.json";

const productsQuery = queryOptions({ queryKey: ["products"], queryFn: () => listProducts() });

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "BTV Stick — Transforme sua TV em Smart TV | Frete grátis" },
      {
        name: "description",
        content: "BTV Stick: conecte no HDMI e assista filmes, séries, esportes e apps. Frete grátis, 1 ano de garantia e até 10x sem juros.",
      },
      { property: "og:title", content: "BTV Stick — Sua TV comum vira Smart TV" },
      { property: "og:description", content: "Modelos Lite, 4K e 4K Max com frete grátis e até 10x sem juros." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(productsQuery),
  component: Index,
});

const highlights = [
  { title: "4K", text: "Imagem ultra nítida" },
  { title: "Plug & Play", text: "Instala em 1 minuto" },
  { title: "1 ano", text: "De garantia" },
];

const perks = [
  { icon: Truck, text: "Frete grátis para todo o Brasil" },
  { icon: CreditCard, text: "Até 10x sem juros no cartão" },
  { icon: ShieldCheck, text: "Pagamento seguro Mercado Pago" },
  { icon: Headphones, text: "Suporte pelo WhatsApp" },
];

function ProductCard({ product }: { product: Product }) {
  const { add } = useCart();
  const featured = product.is_featured;
  return (
    <article
      className={`relative flex flex-col rounded-3xl border p-7 bg-gradient-card ${
        featured ? "border-primary/60 shadow-glow md:-translate-y-4" : "border-border"
      }`}
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold tracking-wide text-primary-foreground">
          MAIS VENDIDO
        </span>
      )}
      <div className="flex items-center gap-3">
        <span className={`grid size-12 place-items-center rounded-full ${featured ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}>
          <Tv className="size-5" />
        </span>
        <div>
          <h3 className="text-xl font-bold">{product.name}</h3>
          <p className="text-xs tracking-[0.25em] text-muted-foreground">{product.tag}</p>
        </div>
      </div>
      <p className="mt-6 font-display text-4xl font-bold">{formatBRL(product.price_cents)}</p>
      <p className="mt-1 text-sm text-muted-foreground">
        ou até {product.max_installments}x de{" "}
        <strong className="text-foreground">{formatBRL(installmentCents(product.price_cents, product.max_installments))}</strong> sem juros
      </p>
      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {product.features.map((f) => (
          <li key={f} className="flex items-center gap-3">
            <span className="grid size-5 place-items-center rounded-full bg-primary/15 text-primary">
              <Check className="size-3" />
            </span>
            {f}
          </li>
        ))}
        <li className="flex items-center gap-3 text-accent">
          <span className="grid size-5 place-items-center rounded-full bg-accent/15">
            <Check className="size-3" />
          </span>
          Frete grátis
        </li>
      </ul>
      <button
        type="button"
        onClick={() => add(product)}
        className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full py-3 font-semibold transition-opacity hover:opacity-90 ${
          featured ? "bg-gradient-primary text-primary-foreground" : "border border-border hover:bg-secondary"
        }`}
      >
        <ShoppingCart className="size-4" /> Adicionar ao carrinho
      </button>
    </article>
  );
}

function Index() {
  const { data: products } = useSuspenseQuery(productsQuery);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const featured = products.find((p) => p.is_featured) ?? products[0];

  return (
    <div id="top" className="min-h-screen">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden bg-gradient-hero">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 md:grid-cols-2 md:py-20">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-accent/50 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                <Truck className="size-3.5" /> Frete grátis para todo o Brasil
              </span>
              <h1 className="mt-5 text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
                Sua TV comum vira <span className="text-gradient-primary">Smart TV</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg text-muted-foreground">
                Conecte na entrada HDMI e assista filmes, séries, esportes e apps em segundos.
              </p>
              {featured && (
                <div className="mt-8 inline-flex items-center gap-4 rounded-2xl border border-primary/40 bg-card/60 px-5 py-4 shadow-glow">
                  <span className="grid size-11 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
                    <CreditCard className="size-5" />
                  </span>
                  <div>
                    <p className="text-xs text-muted-foreground">Leve o seu parcelado</p>
                    <p className="font-display text-2xl font-bold">
                      {featured.max_installments}x de{" "}
                      <span className="text-primary">{formatBRL(installmentCents(featured.price_cents, featured.max_installments))}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">sem juros no cartão de crédito</p>
                  </div>
                </div>
              )}
              <div className="mt-8 flex flex-wrap gap-3">
                <a href="#produtos" className="rounded-full bg-gradient-primary px-7 py-3 font-semibold text-primary-foreground shadow-glow">
                  Ver modelos
                </a>
                <a
                  href={whatsappLink("Olá! Quero comprar o BTV Stick.")}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border px-7 py-3 font-semibold hover:bg-secondary"
                >
                  <WhatsAppIcon className="size-4 text-whatsapp" /> Falar no WhatsApp
                </a>
              </div>
            </div>
            <div className="overflow-hidden rounded-3xl border border-primary/40 shadow-glow">
              <img
                src={posterAsset.url}
                alt="BTV Stick com controle remoto — transforme sua TV em uma Smart TV"
                width={1254}
                height={1254}
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        <section id="beneficios" className="mx-auto max-w-6xl scroll-mt-20 px-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {highlights.map((h) => (
              <div key={h.title} className="rounded-3xl border border-border bg-gradient-card p-7 text-center">
                <p className="font-display text-3xl font-bold text-primary">{h.title}</p>
                <p className="mt-1 text-muted-foreground">{h.text}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {perks.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 rounded-2xl border border-border bg-card/50 px-4 py-4 text-sm text-muted-foreground">
                <Icon className="size-5 shrink-0 text-primary" /> {text}
              </div>
            ))}
          </div>
        </section>

        <section id="produtos" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-24 sm:px-6">
          <div className="text-center">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Escolha seu BTV Stick</h2>
            <p className="mt-3 text-muted-foreground">Todos com frete grátis, 1 ano de garantia e parcelamento em até 10x sem juros.</p>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>

        <section className="border-t border-border/60 px-4 py-14 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-6 rounded-3xl border border-primary/30 bg-gradient-card p-8 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-3xl font-bold">Ficou com alguma dúvida?</h2>
              <p className="mt-2 text-muted-foreground">Fale com a gente no WhatsApp e escolha o modelo ideal para sua TV.</p>
            </div>
            <a
              href={whatsappLink("Olá! Tenho uma dúvida sobre o BTV Stick.")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-whatsapp px-7 py-3 font-semibold text-whatsapp-foreground"
            >
              <WhatsAppIcon /> {WHATSAPP_DISPLAY}
            </a>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 pb-10 text-sm text-muted-foreground sm:flex-row sm:px-6">
        <Logo className="text-base" />
        <p className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-primary" /> Pagamentos processados com segurança pelo Mercado Pago
        </p>
        <p>© {new Date().getFullYear()} BTV Stick</p>
      </footer>

      <a
        href={whatsappLink("Olá! Quero comprar o BTV Stick.")}
        target="_blank"
        rel="noreferrer"
        aria-label="Conversar no WhatsApp"
        className="fixed bottom-5 right-5 z-30 grid size-14 place-items-center rounded-full bg-whatsapp text-whatsapp-foreground shadow-lg transition-transform hover:scale-105"
      >
        <WhatsAppIcon className="size-7" />
      </a>

      <CartSheet onCheckout={() => setCheckoutOpen(true)} />
      <CheckoutDialog open={checkoutOpen} onOpenChange={setCheckoutOpen} />
    </div>
  );
}
