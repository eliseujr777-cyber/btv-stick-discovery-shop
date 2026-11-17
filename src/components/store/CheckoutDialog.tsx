import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, CreditCard, Loader2, Lock, MapPin, ShieldCheck, Truck, User } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCart } from "@/lib/cart";
import { createOrder } from "@/lib/store.functions";
import {
  formatBRL,
  installmentCents,
  isValidCPF,
  maskCEP,
  maskCPF,
  maskPhone,
  MAX_INSTALLMENTS,
  onlyDigits,
  whatsappLink,
} from "@/lib/format";
import posterAsset from "@/assets/btv-stick-poster.png.asset.json";
import { WhatsAppIcon } from "./WhatsAppIcon";

type Step = 0 | 1 | 2;
const steps = [
  { label: "Seus dados", icon: User },
  { label: "Entrega", icon: MapPin },
  { label: "Pagamento", icon: CreditCard },
];

const emptyCustomer = { fullName: "", cpf: "", phone: "", email: "" };
const emptyAddress = { cep: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: "" };

function Field({
  label,
  error,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-foreground">{label}</span>
      <input
        {...props}
        className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary focus:ring-2 focus:ring-ring/30"
      />
      {error && <span className="mt-1 block text-xs text-destructive">{error}</span>}
    </label>
  );
}

export function CheckoutDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { items, subtotalCents, clear } = useCart();
  const submitOrder = useServerFn(createOrder);
  const [step, setStep] = useState<Step>(0);
  const [customer, setCustomer] = useState(emptyCustomer);
  const [address, setAddress] = useState(emptyAddress);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cepStatus, setCepStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<{ orderNumber: number; link: string } | null>(null);

  const summaryItems = done ? [] : items;

  function close(v: boolean) {
    onOpenChange(v);
    if (!v) {
      setTimeout(() => {
        setStep(0);
        setDone(null);
        setErrors({});
      }, 200);
    }
  }

  function validateCustomer() {
    const e: Record<string, string> = {};
    if (customer.fullName.trim().length < 3) e.fullName = "Informe seu nome completo";
    if (!isValidCPF(customer.cpf)) e.cpf = "CPF inválido";
    if (![10, 11].includes(onlyDigits(customer.phone).length)) e.phone = "Telefone inválido";
    if (!/^\S+@\S+\.\S+$/.test(customer.email)) e.email = "E-mail inválido";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function validateAddress() {
    const e: Record<string, string> = {};
    if (onlyDigits(address.cep).length !== 8) e.cep = "CEP inválido";
    if (address.street.trim().length < 2) e.street = "Obrigatório";
    if (!address.number.trim()) e.number = "Obrigatório";
    if (address.neighborhood.trim().length < 2) e.neighborhood = "Obrigatório";
    if (address.city.trim().length < 2) e.city = "Obrigatório";
    if (address.state.trim().length !== 2) e.state = "UF";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function lookupCep(raw: string) {
    const cep = onlyDigits(raw);
    if (cep.length !== 8) return;
    setCepStatus("loading");
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const json = await res.json();
      if (json.erro) throw new Error("not found");
      setAddress((a) => ({
        ...a,
        street: json.logradouro || a.street,
        neighborhood: json.bairro || a.neighborhood,
        city: json.localidade || a.city,
        state: json.uf || a.state,
      }));
      setCepStatus("ok");
    } catch {
      setCepStatus("error");
    }
  }

  function whatsappMessage(orderNumber?: number) {
    const lines = items.map((i) => `• ${i.quantity}x ${i.product.name} — ${formatBRL(i.product.price_cents * i.quantity)}`);
    return [
      orderNumber ? `Olá! Acabei de fazer o pedido #${orderNumber} no site.` : "Olá! Quero comprar o BTV Stick.",
      "",
      ...lines,
      `Total: ${formatBRL(subtotalCents)} (frete grátis)`,
      "",
      customer.fullName && `Nome: ${customer.fullName}`,
      customer.cpf && `CPF: ${customer.cpf}`,
      customer.phone && `Telefone: ${customer.phone}`,
      customer.email && `E-mail: ${customer.email}`,
      address.street &&
        `Endereço: ${address.street}, ${address.number}${address.complement ? ` - ${address.complement}` : ""}, ${address.neighborhood}, ${address.city}/${address.state} - CEP ${address.cep}`,
    ]
      .filter((l) => l !== "" || true)
      .filter((l) => l !== false && l !== undefined)
      .join("\n");
  }

  async function finish() {
    setSubmitting(true);
    try {
      const result = await submitOrder({
        data: {
          customer,
          address,
          items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        },
      });
      const link = whatsappLink(whatsappMessage(result.orderNumber));
      setDone({ orderNumber: result.orderNumber, link });
      clear();
      window.open(link, "_blank", "noopener");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível registrar o pedido.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] max-w-4xl gap-0 overflow-y-auto border-border bg-card p-0 sm:rounded-3xl">
        <div className="grid md:grid-cols-[1fr_300px]">
          <div className="p-6 sm:p-8">
            <DialogTitle className="font-display text-2xl font-bold">Finalizar compra</DialogTitle>
            <DialogDescription className="mt-1 flex items-center gap-1.5 text-sm">
              <Lock className="size-3.5 text-primary" /> Ambiente seguro · Pagamento via Mercado Pago
            </DialogDescription>

            {!done && (
              <ol className="mt-6 flex items-center gap-2">
                {steps.map((s, i) => {
                  const Icon = i < step ? Check : s.icon;
                  const active = i <= step;
                  return (
                    <li key={s.label} className="flex flex-1 items-center gap-2 last:flex-none">
                      <span
                        className={`grid size-8 shrink-0 place-items-center rounded-full border ${
                          i < step ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-border text-muted-foreground"
                        }`}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className={`text-xs sm:text-sm ${active ? "font-semibold" : "text-muted-foreground"}`}>{s.label}</span>
                      {i < steps.length - 1 && <span className="hidden h-px flex-1 bg-border sm:block" />}
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="mt-6">
              {done ? (
                <div className="space-y-4 rounded-2xl border border-primary/40 bg-primary/5 p-6 text-center">
                  <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-6" />
                  </span>
                  <h3 className="font-display text-xl font-bold">Pedido #{done.orderNumber} registrado!</h3>
                  <p className="text-sm text-muted-foreground">
                    Envie a mensagem no WhatsApp para combinar o pagamento. Seus dados já vão preenchidos.
                  </p>
                  <a
                    href={done.link}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-whatsapp px-6 py-3 font-semibold text-whatsapp-foreground"
                  >
                    <WhatsAppIcon /> Abrir WhatsApp
                  </a>
                </div>
              ) : step === 0 ? (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (validateCustomer()) setStep(1);
                  }}
                >
                  <Field label="Nome completo" placeholder="Maria da Silva" autoComplete="name" value={customer.fullName} error={errors.fullName} onChange={(e) => setCustomer({ ...customer, fullName: e.target.value })} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="CPF" placeholder="000.000.000-00" inputMode="numeric" value={customer.cpf} error={errors.cpf} onChange={(e) => setCustomer({ ...customer, cpf: maskCPF(e.target.value) })} />
                    <Field label="Telefone / WhatsApp" placeholder="(21) 99999-9999" inputMode="tel" autoComplete="tel" value={customer.phone} error={errors.phone} onChange={(e) => setCustomer({ ...customer, phone: maskPhone(e.target.value) })} />
                  </div>
                  <Field label="E-mail" type="email" placeholder="voce@email.com" autoComplete="email" value={customer.email} error={errors.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} />
                  <button type="submit" className="w-full rounded-full bg-gradient-primary py-3 font-semibold text-primary-foreground shadow-glow">
                    Continuar para entrega
                  </button>
                </form>
              ) : step === 1 ? (
                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (validateAddress()) setStep(2);
                  }}
                >
                  <div className="grid items-end gap-4 sm:grid-cols-2">
                    <Field
                      label="CEP"
                      placeholder="00000-000"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      value={address.cep}
                      error={errors.cep}
                      onChange={(e) => {
                        const v = maskCEP(e.target.value);
                        setAddress({ ...address, cep: v });
                        if (onlyDigits(v).length === 8) lookupCep(v);
                      }}
                    />
                    <p className="pb-3 text-xs text-muted-foreground">
                      {cepStatus === "loading" && "Buscando endereço…"}
                      {cepStatus === "ok" && <span className="text-accent">Frete grátis para o seu endereço!</span>}
                      {cepStatus === "error" && "CEP não encontrado — preencha manualmente."}
                      {cepStatus === "idle" && "Digite o CEP para calcular o frete."}
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                    <Field label="Rua / Avenida" autoComplete="address-line1" value={address.street} error={errors.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} />
                    <Field label="Número" value={address.number} error={errors.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Complemento" placeholder="Apto, bloco…" value={address.complement} onChange={(e) => setAddress({ ...address, complement: e.target.value })} />
                    <Field label="Bairro" value={address.neighborhood} error={errors.neighborhood} onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })} />
                  </div>
                  <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
                    <Field label="Cidade" value={address.city} error={errors.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} />
                    <Field label="UF" maxLength={2} value={address.state} error={errors.state} onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })} />
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(0)} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 font-semibold">
                      <ArrowLeft className="size-4" /> Voltar
                    </button>
                    <button type="submit" className="flex-1 rounded-full bg-gradient-primary py-3 font-semibold text-primary-foreground shadow-glow">
                      Continuar para pagamento
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-accent/40 bg-accent/10 p-5">
                    <p className="font-semibold text-accent">Pagamento com cartão em ativação</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      O pagamento online ainda não foi ativado pela loja. Finalize agora pelo WhatsApp — seus dados já vão preenchidos na mensagem.
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 font-semibold">
                      <ArrowLeft className="size-4" /> Voltar
                    </button>
                    <button
                      type="button"
                      disabled={submitting || items.length === 0}
                      onClick={finish}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-whatsapp py-3 font-semibold text-whatsapp-foreground disabled:opacity-60"
                    >
                      {submitting ? <Loader2 className="size-4 animate-spin" /> : <WhatsAppIcon />}
                      Finalizar pelo WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </div>

            {!done && (
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Prefere comprar com ajuda?{" "}
                <a href={whatsappLink(whatsappMessage())} target="_blank" rel="noreferrer" className="font-semibold text-whatsapp">
                  Finalize pelo WhatsApp
                </a>
              </p>
            )}
          </div>

          <aside className="border-t border-border bg-background/40 p-6 sm:p-8 md:border-l md:border-t-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Resumo do pedido</p>
            <ul className="mt-4 space-y-3">
              {summaryItems.map(({ product, quantity }) => (
                <li key={product.id} className="flex items-center gap-3">
                  <span className="relative">
                    <img src={product.image_url ?? posterAsset.url} alt="" className="size-12 rounded-lg object-cover" />
                    <span className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{quantity}</span>
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{formatBRL(product.price_cents)} cada</p>
                  </div>
                  <span className="text-sm font-semibold">{formatBRL(product.price_cents * quantity)}</span>
                </li>
              ))}
            </ul>
            {!done && (
              <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatBRL(subtotalCents)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Frete</span>
                  <span className="font-semibold text-accent">Grátis</span>
                </div>
                <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                  <span>Total</span>
                  <span>{formatBRL(subtotalCents)}</span>
                </div>
                <p className="text-xs text-primary">
                  ou {MAX_INSTALLMENTS}x de {formatBRL(installmentCents(subtotalCents))} sem juros
                </p>
              </div>
            )}
            <div className="mt-6 space-y-2 text-xs text-muted-foreground">
              <p className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" /> Dados do cartão protegidos pelo Mercado Pago
              </p>
              <p className="flex items-center gap-2">
                <Truck className="size-4 text-primary" /> Entrega para todo o Brasil
              </p>
            </div>
          </aside>
        </div>
      </DialogContent>
    </Dialog>
  );
}
