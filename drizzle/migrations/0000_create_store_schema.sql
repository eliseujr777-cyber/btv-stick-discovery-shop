-- Roles
create type public.app_role as enum ('admin', 'user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users can read own roles" on public.user_roles
  for select to authenticated using (auth.uid() = user_id);

-- updated_at helper
create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Products
create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  tag text not null,
  description text,
  price_cents integer not null check (price_cents >= 0),
  max_installments integer not null default 10 check (max_installments between 1 and 24),
  features text[] not null default '{}',
  is_featured boolean not null default false,
  image_url text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "Anyone can view active products" on public.products
  for select to anon, authenticated using (active = true);
create policy "Admins can view all products" on public.products
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can insert products" on public.products
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update products" on public.products
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can delete products" on public.products
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
create trigger products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- Customers
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  cpf text not null unique,
  phone text not null,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index customers_email_idx on public.customers (email);
grant select, update on public.customers to authenticated;
grant all on public.customers to service_role;
alter table public.customers enable row level security;
create policy "Admins can view customers" on public.customers
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update customers" on public.customers
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create trigger customers_updated_at before update on public.customers
  for each row execute function public.set_updated_at();

-- Orders
create type public.order_status as enum ('pendente', 'pago', 'enviado', 'entregue', 'cancelado');

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity (start with 1001) unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  status public.order_status not null default 'pendente',
  payment_method text not null default 'whatsapp',
  subtotal_cents integer not null check (subtotal_cents >= 0),
  shipping_cents integer not null default 0 check (shipping_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  cep text not null,
  street text not null,
  number text not null,
  complement text,
  neighborhood text not null,
  city text not null,
  state text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_customer_idx on public.orders (customer_id);
create index orders_status_idx on public.orders (status, created_at desc);
grant select, update on public.orders to authenticated;
grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "Admins can view orders" on public.orders
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins can update orders" on public.orders
  for update to authenticated using (public.has_role(auth.uid(), 'admin'));
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- Order items
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity between 1 and 99),
  line_total_cents integer not null check (line_total_cents >= 0),
  created_at timestamptz not null default now()
);
create index order_items_order_idx on public.order_items (order_id);
grant select on public.order_items to authenticated;
grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "Admins can view order items" on public.order_items
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- Seed products
insert into public.products (slug, name, tag, price_cents, max_installments, features, is_featured, sort_order) values
  ('btv-stick-lite', 'BTV Stick Lite', 'LITE', 19990, 10, array['Full HD 1080p','Wi‑Fi 2.4GHz','Controle remoto'], false, 1),
  ('btv-stick-4k', 'BTV Stick 4K', '4K', 29990, 10, array['Ultra HD 4K HDR','Wi‑Fi dual band','Controle por voz'], true, 2),
  ('btv-stick-4k-max', 'BTV Stick 4K Max', 'MAX', 39990, 10, array['4K HDR10+','Wi‑Fi 6','Bluetooth 5.0 + voz'], false, 3);