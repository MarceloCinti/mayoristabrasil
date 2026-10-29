# Mayorista Brasil — Setup

Guia passo a passo pra colocar o sistema no ar (tudo grátis).

## 1. Instalar dependências

Abra o terminal na pasta `C:\mayorista-brasil` e rode:

```bash
npm install
```

## 2. Configurar Firebase (grátis, plano Spark)

Você já criou a conta com `contingenciamc1@gmail.com`. Agora:

### 2.1 Criar o projeto

1. Vá em https://console.firebase.google.com
2. Clique em **Adicionar projeto** → nome: `mayorista-brasil`
3. Pode desabilitar Google Analytics (não precisa)
4. Aguarde a criação

### 2.2 Habilitar Authentication

1. Menu esquerdo → **Authentication** → **Começar**
2. Aba **Sign-in method**:
   - Habilite **Email/senha**
   - Habilite **Google** (botão "Salvar")

### 2.3 Habilitar Firestore Database

1. Menu esquerdo → **Firestore Database** → **Criar banco**
2. Selecione **Modo de produção** (não teste)
3. Localização: `southamerica-east1` (São Paulo, mais perto do Paraguay)
4. Clique em **Ativar**

### 2.4 Aplicar as regras de segurança

1. Em Firestore → aba **Regras**
2. Apague o conteúdo e cole o conteúdo de `firestore.rules` (deste projeto)
3. Clique em **Publicar**

### 2.5 Habilitar Storage (pra subir PDFs dos bonos depois)

1. Menu esquerdo → **Storage** → **Começar**
2. Modo de produção, mesma região (`southamerica-east1`)

### 2.6 Pegar as credenciais do Firebase

1. Menu esquerdo → ⚙️ ao lado de "Visão geral" → **Configurações do projeto**
2. Aba **Geral**, role até **Seus apps**
3. Clique no ícone `</>` (Web)
4. Apelido: `mayorista-brasil-web` → **Registrar app**
5. Copie o objeto `firebaseConfig` que aparece — vai usar agora

## 3. Configurar variáveis de ambiente

Copie `.env.local.example` para `.env.local`:

```bash
cp .env.local.example .env.local
```

Abra `.env.local` e preencha com os valores do `firebaseConfig`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=mayorista-brasil.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mayorista-brasil
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=mayorista-brasil.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abc...

NEXT_PUBLIC_ADMIN_EMAIL=contingenciamc1@gmail.com
NEXT_PUBLIC_WHATSAPP=595984441777
NEXT_PUBLIC_PRECIO_GS=59000
```

## 4. Rodar localmente

```bash
npm run dev
```

Acesse http://localhost:3000

### Primeiro acesso como admin

1. Vá em `/registro`
2. Crie a conta com `contingenciamc1@gmail.com`
3. Como esse email é o `ADMIN_EMAIL`, o sistema marca `esAdmin: true` automaticamente
4. Vá em `/admin` — você verá o painel

## 5. Como funciona o fluxo de venda

1. Cliente entra na landing (`/`)
2. Cria conta em `/registro`
3. É redirecionado pra `/comprar` com instruções de pagamento por WhatsApp
4. Cliente envia comprovante pelo WhatsApp `+595 984 441 777`
5. Você (admin) vai em `/admin/usuarios`, busca o cliente e clica em **Liberar acceso**
6. Cliente já pode acessar o conteúdo completo em `/dashboard`

## 6. Como subir conteúdo

### Proveedores (lista principal)

Em `/admin/proveedores`:
- **Importar CSV**: clique em "Importar CSV", baixe a plantilla, preencha no Google Sheets, exporte como CSV (Arquivo → Baixar → CSV) e suba
- **Manual**: clique em "Nuevo proveedor" e preencha o formulário

Categorias válidas: `femenino, masculino, infantil, jeans, fitness, plus-size, bolsas, tenis, bijuterias, evangelica, streetwear, atacado-premium, moda-barata`

Marque `esSecreto: sí` pra que o proveedor apareça só na seção "Proveedores Secretos" (não na lista pública).

### Conteúdo de texto (mapa, importar, tendencias, estafas)

Em `/admin/contenido`:
- Selecione a seção
- Edite com HTML básico (h2, h3, p, ul, li, strong, a, img)
- Clique em "Guardar"

### Bonos

Em `/admin/bonos`:
- Os 4 bonos padrão aparecem automaticamente se você não cadastrar nenhum
- Pra adicionar links/PDFs, clique em "Nuevo bono" e preencha
- Pra subir PDFs: use o Firebase Storage Console (Storage → Upload), copie o URL público e cole no campo "Archivo URL"

## 7. Publicar grátis na internet (Vercel)

1. Crie conta em https://vercel.com (use o mesmo Google)
2. Instale a CLI:
   ```bash
   npm i -g vercel
   ```
3. Na pasta do projeto:
   ```bash
   vercel
   ```
4. Siga as perguntas (criar projeto novo → confirmar)
5. Quando perguntar pelas variáveis de ambiente, cole as mesmas do `.env.local`
   - Alternativa: depois do primeiro deploy, vá em vercel.com → Project → Settings → Environment Variables e cole tudo
6. Rode `vercel --prod` pra publicar a versão final

**Você vai ter um endereço tipo:** `mayorista-brasil.vercel.app`

Quando comprar um domínio (ex: mayoristabrasil.com), você adiciona em Vercel → Settings → Domains.

### IMPORTANTE: adicionar o domínio Vercel no Firebase

Depois do deploy:
1. Firebase Console → Authentication → Settings → **Domínios autorizados**
2. Adicione `mayorista-brasil.vercel.app` (e seu domínio quando comprar)

## 8. Estrutura do projeto

```
mayorista-brasil/
├── src/
│   ├── pages/
│   │   ├── index.tsx              ← Landing
│   │   ├── login.tsx
│   │   ├── registro.tsx
│   │   ├── comprar.tsx            ← Instruções de pagamento
│   │   ├── dashboard/
│   │   │   ├── index.tsx          ← Hub do dashboard
│   │   │   ├── proveedores.tsx
│   │   │   ├── secretos.tsx
│   │   │   ├── mapa.tsx
│   │   │   ├── importar.tsx
│   │   │   ├── tendencias.tsx
│   │   │   ├── estafas.tsx
│   │   │   └── bonos.tsx
│   │   └── admin/
│   │       ├── index.tsx          ← Dashboard admin
│   │       ├── usuarios.tsx       ← Liberar acesso
│   │       ├── proveedores.tsx    ← CRUD + CSV
│   │       ├── contenido.tsx      ← Editor das seções de texto
│   │       └── bonos.tsx
│   ├── context/AuthContext.tsx
│   ├── hooks/
│   │   ├── useAdminGuard.ts       ← Protege rotas admin
│   │   └── usePagoGuard.ts        ← Protege conteúdo pago
│   ├── components/
│   │   ├── DashboardLayout.tsx
│   │   ├── SeccionContenido.tsx   ← Renderiza HTML salvo no admin
│   │   └── admin/AdminLayout.tsx
│   └── lib/
│       ├── firebase.ts
│       └── categorias.ts
└── firestore.rules
```

## 9. Coleções no Firestore

- `usuarios/{uid}` — `{ uid, email, nombre, pago, fechaCompra, esAdmin, createdAt }`
- `proveedores/{id}` — `{ nombre, categoria, whatsapp, instagram, direccion, googleMaps, rangoPrecio, pedidoMinimo, enviaParaguay, formaPago, catalogo, esSecreto, observaciones }`
- `contenido/{seccion}` — `{ cuerpo, actualizadoEn }` (seccion = 'mapa', 'importar', 'tendencias', 'estafas')
- `bonos/{id}` — `{ numero, titulo, descripcion, enlace, archivo }`

## 10. Próximos passos sugeridos

- Validar o produto vendendo no boca-a-boca / Instagram
- Quando estiver vendendo bem, integrar pagamento automático (Bancard, Pagopar ou MercadoPago)
- Comprar domínio próprio (ex: `mayoristabrasil.com`)
- Adicionar Google Analytics ou Plausible pra monitorar tráfego
