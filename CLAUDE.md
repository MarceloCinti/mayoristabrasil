# Mayorista Brasil — guia para quem assume o projeto

Plataforma de assinatura que vende, a revendedores paraguaios, acesso a uma base
de fornecedores atacadistas brasileiros. Landing pública em espanhol → cadastro →
acesso de teste → paywall → painel pago. Tem ainda programa de afiliados e um
serviço de câmbio R$/Gs.

**No ar:** https://mayorista-brasil.vercel.app

---

## 1. Como rodar

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # build de produção
```

Node 24, npm 11. Next.js 14 (Pages Router), React 18, TypeScript, CSS Modules.
Firebase (Auth + Firestore + Storage) no cliente. Sem testes automatizados.

**Nunca rode `npm run build` com o `next dev` ligado.** O build sobrescreve
`.next/` e derruba o servidor de dev com `Cannot find module './chunks/...'`.
Se acontecer: pare o dev, `rm -rf .next`, reinicie.

---

## 2. Acessos — onde estão as credenciais

**Nenhum segredo está escrito neste arquivo, de propósito.** Abaixo está onde
cada um mora e como obtê-lo.

| O quê | Onde | Observação |
|---|---|---|
| Variáveis de ambiente (13) | `.env.local` (local) e painel do Vercel (produção) | Já configuradas nos dois lugares. `vercel env ls production` lista os nomes. |
| Conta Google dona de tudo | `contingenciamc1@gmail.com` | Dona do projeto Firebase e da conta Vercel. O usuário às vezes está logado em **outra** conta Google e o projeto some da lista do Firebase. |
| Vercel | conta `contingenciamc1-3536`, projeto `mayorista-brasil` | `projectId` e `orgId` em `.vercel/project.json`. `vercel whoami` confirma o login. |
| Firebase | projeto `mayorista-brasil` | Console: https://console.firebase.google.com/project/mayorista-brasil |
| Chave de serviço (admin SDK) | `scripts/serviceAccount.json` — **não versionada, não deployada** | Só existe se alguém gerou. Firebase Console → Configurações → Contas de serviço. Dá acesso total: tratar como senha. |
| Brevo (e-mails) | `BREVO_API_KEY` nas env vars | Limite gratuito de 300 e-mails/dia. |
| Admin do sistema | e-mail em `NEXT_PUBLIC_ADMIN_EMAIL` | Quem se cadastra com esse e-mail vira admin automaticamente. Admins existentes podem promover outros em `/admin/usuarios`. |

As variáveis `NEXT_PUBLIC_*` vão para o navegador e **não são secretas** (a chave
de API do Firebase é pública por design; quem protege é a regra do Firestore).
As `BREVO_*` são de servidor e nunca devem ganhar o prefixo `NEXT_PUBLIC_`.

---

## 3. Controle de versão

Branch `main`, com remoto no GitHub:
https://github.com/MarceloCinti/mayoristabrasil (`origin`). Depois de commitar,
`git push`.

**O repositório é público.** Por isso nenhum segredo pode entrar no git — antes
de commitar arquivo novo de configuração, confira que não tem chave.

Fora do versionamento, por design: `.env.local`, `.vercel/`, `node_modules/`,
`.next/`, a chave de serviço do Firebase, e um `.docx` pessoal solto na raiz.
O antigo `sifat/` (outro projeto) foi movido para `C:\sifat`.

O deploy no Vercel continua sendo pela CLI (`vercel --prod`), não pelo GitHub.

---

## 4. Deploy

```bash
vercel --prod --yes
```

**Instrução permanente do usuário: publicar sempre, sem perguntar.** Depois de
cada alteração — build, deploy, e só então relatar, já com verificação feita em
produção. Ele acompanha o resultado pelo site publicado, não pelo servidor local.

Sempre pare o servidor de dev antes de buildar/deployar.

O `.vercelignore` mantém `scripts/` e a chave de serviço fora do upload. Vale
conferir depois de mexer nele:

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://mayorista-brasil.vercel.app/scripts/serviceAccount.json
```

Deve dar **404**.

---

## 5. Firestore — e a armadilha das regras

### Regras NÃO sobem no deploy

`firestore.rules` fica no projeto mas o Vercel **não publica**. O usuário cola o
conteúdo à mão em
https://console.firebase.google.com/project/mayorista-brasil/firestore/rules

Se você mudar uma regra e só fizer deploy do site, a tela abre e as listas vêm
**vazias** — o banco recusa a leitura, sem erro visível. Ao mexer em regras:
avise explicitamente, mande o conteúdo pronto para colar, e diga para publicar
as regras **antes** do deploy do site.

Evite mudanças de regra desnecessárias. Exemplo real: a regra do teste conta o
*tamanho* de um array, não o conteúdo — foi possível trocar a semântica de
"seções vistas" para "cliques" sem tocar nas regras.

### Coleções

| Coleção | Conteúdo | Quem lê |
|---|---|---|
| `usuarios/{uid}` | perfil, `pago`, `esAdmin`, afiliado, `trialVistas` | o próprio, admin, e o afiliado que o indicou |
| `proveedores/{id}` | base de fornecedores (~1117) | pagos, admins e quem está em teste |
| `contenido/{seccion}` | HTML das seções mapa/importar/tendencias/estafas | idem |
| `bonos/{id}` | bônus | idem |
| `resenas/{id}` | avaliações | leitura idem; escrita só pagos |
| `favoritos/{id}` | favoritos (id = `uid_proveedorId`) | o dono |
| `solicitudesAfiliado` | pedidos de virar afiliado | admin + o próprio |
| `solicitudesPago` | saques de comissão | admin + o afiliado |
| `solicitudesCambio` | pedidos de câmbio R$/Gs | admin + o próprio |
| `config/{id}` | **leitura pública** | ver abaixo |

Documentos em `config/`: `landing` (textos/vídeos da home), `pago` (dados de
transferência + Hotmart), `stats` e `preview` (números e vitrine da landing —
existem porque a landing é pública e **não pode** ler `proveedores`),
`categorias`, `sheets`, `cambio`.

---

## 6. Fluxo do usuário

```
landing → /registro → /continuar → /completar-perfil → /dashboard
```

`/continuar` é a central de roteamento: admin e pago vão ao painel; afiliado sem
compra vai a `/afiliado`; o resto vai ao painel com acesso de teste.

**Acesso de teste:** 5 cliques. Cada link do menu e cada card de fornecedor
aberto conta um. Contado por um ouvinte em fase de captura na raiz de
`DashboardLayout`; cada clique grava um marcador em `usuarios.trialVistas` (o
campo se chama "vistas" por histórico — hoje guarda cliques). No quinto, o
conteúdo desfoca e aparece `PaywallModal`.

**A mecânica é invisível para o cliente** — nada de contador na tela nem de
mencionar o número de cliques. O usuário pediu isso explicitamente.

**Pagamento:** transferência (dados editáveis em `/admin/datos-pago`) ou cartão
via Hotmart. Ao clicar "Ya transferí", grava `pagoPendiente` no usuário, mostra
contagem de 1h e aparece em `/admin/usuarios` com selo. **O admin confere e
libera à mão** — a contagem é só o prazo prometido, não libera sozinha.

---

## 7. Design

Tema **único e claro**. O tema escuro e o alternador foram removidos — não
reintroduza `data-theme`.

Paleta amostrada da bandeira do Brasil real (não dos hex "oficiais", que
renderizam frios): verde `#12803B`, dourado `#F2C40C`, azul-royal `#1D3F94`.
Tudo em tokens no topo de `src/styles/globals.css`.

Tokens legados `--rojo`, `--py-rojo`, `--accent` ainda existem e **valem verde** —
são ~36 usos que não valeu a pena renomear. Em código novo use `--brand`,
`--azul`, `--amarelo`.

Vermelho sobrevive só onde significa **perigo** (excluir, erro), não marca.

---

## 8. Pendências conhecidas

1. **Fotos dos fornecedores quebradas.** O import do Outscraper guardou *links*
   para fotos do Google Maps (`lh3.googleusercontent.com/gps-cs-s/...`) em vez de
   baixar as imagens. Esses links expiram: hoje dão **403**. O componente
   `Foto.tsx` mostra um placeholder no lugar do ícone quebrado, mas as fotos não
   voltam. Conserto: reimportar com export novo do Outscraper e rodar
   `node scripts/rehospedar-fotos.js --aplicar`, que baixa e hospeda no Storage
   do projeto. Rode **logo após** o import — links velhos nem dão para baixar.
   O script precisa da chave de serviço e é seguro repetir.

2. **Hotmart não libera acesso sozinho.** Existe a aba e o link, mas a liberação
   automática exige um webhook (endpoint que recebe a confirmação da Hotmart e
   marca `pago: true`). **Não foi feito.** Hoje cartão também precisa de
   liberação manual. O usuário pediu "liberação imediata" — isso ainda não existe.

3. **Dados de transferência vazios.** Preencher em `/admin/datos-pago`. Enquanto
   vazio, o popup mostra um botão de pedir os dados por WhatsApp.

4. **Vídeo do hero.** O hero hoje é um carrossel de 2 fotos (`HeroCarrusel.tsx`),
   não vídeo. Os campos de upload de vídeo do hero foram removidos do admin.


---

## 9. Mapa do código

```
src/
  pages/
    index.tsx            landing (~640 linhas)
    continuar.tsx        roteador pós-login — entenda este antes de mexer em fluxo
    dashboard/           área paga
    admin/               painel administrativo
    api/enviar-*.ts      e-mails via Brevo (únicas rotas de servidor)
  components/
    DashboardLayout.tsx  menu + contagem de cliques + paywall
    PaywallModal.tsx     popup de pagamento
    HeroCarrusel.tsx     banner da landing (fotos e preços na const SLIDES)
    Foto.tsx             imagem com fallback
    ProveedorCard.tsx    card + modal do fornecedor
  hooks/
    usePagoGuard.ts      protege conteúdo pago
    useTrial.ts          gasta um clique do teste
    useAdminGuard.ts / useAfiliadoGuard.ts
  lib/
    trial.ts             limite do teste + dados de pagamento
    firebase.ts          init + constantes (ADMIN_EMAIL, PRECIO_GS...)
    categorias.ts        taxonomia (~180 categorias em 19 grupos)
scripts/                 ferramentas locais, fora do deploy
firestore.rules          colado à mão no console (ver seção 5)
```

---

## 10. Como o usuário trabalha

Fala português, o site é em espanhol. Não é programador: descreve o que quer ver
na tela, manda prints. Acompanha tudo pelo site em produção.

- **Publique sempre**, sem perguntar.
- Ele não tem como testar a área logada por você — **verifique o que der** e diga
  com clareza o que não deu para verificar, em vez de afirmar que está pronto.
- Prints dele são a melhor fonte de bug. Diagnostique com evidência (curl,
  DevTools Protocol, leitura do CSS servido) antes de propor causa.
- Cuidado com cache do navegador dele: já aconteceu de ele ver fotos que, para
  um visitante novo, estavam mortas.
