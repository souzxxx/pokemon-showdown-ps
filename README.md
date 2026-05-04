# Pokémon Showdown PS

Um clone simplificado do Pokémon Showdown feito para a faculdade. Você monta um time de 6 Pokémon, salva no seu perfil e batalha contra uma IA que escolhe um time aleatório do pool dela. Tudo rodando em cima da [PokeAPI](https://pokeapi.co/) — então qualquer Pokémon que existir lá, existe aqui.

## O que dá pra fazer

- Procurar Pokémon por nome com autocomplete (busca na PokeAPI)
- Montar um time de exatamente 6 Pokémon
- Logar com Auth0 e salvar quantos times quiser no seu perfil
- Batalhar turno a turno contra uma IA, com:
  - Cálculo de dano fiel à fórmula clássica (level 50, STAB, crítico, variação aleatória)
  - Tabela de tipos completa (super eficaz, não muito eficaz, imune)
  - Trocas voluntárias e trocas forçadas quando seu Pokémon desmaia
  - Ordem do turno definida pela stat de Speed
  - PP, accuracy e moves de dano físico/especial

## Arquitetura

O backend é dividido em três serviços, cada um com sua responsabilidade. O gateway fica na frente e o frontend só fala com ele.

```
                ┌────────────────┐
                │   Frontend     │  React 19 + Vite + Auth0
                │   (porta 5173) │
                └───────┬────────┘
                        │
                        ▼
                ┌────────────────┐
                │   Gateway      │  proxy reverso
                │   (porta 8000) │
                └───┬────────┬───┘
                    │        │
        /api/pokemon│        │/api/users
        /api/battle │        │
                    ▼        ▼
        ┌──────────────┐  ┌──────────────────┐
        │ Battle API   │  │ Users Service    │
        │ (porta 3001) │  │ (porta 8001)     │
        │              │  │                  │
        │ - PokeAPI    │  │ - Auth0 JWT      │
        │ - Engine     │  │ - Prisma/SQLite  │
        │ - Sessões    │  │ - Times salvos   │
        │   in-memory  │  │                  │
        └──────────────┘  └──────────────────┘
```

### Estrutura de pastas

```
.
├── backend/
│   ├── gateway/       # Proxy reverso (Express + http-proxy-middleware)
│   ├── src/           # Battle API: PokeAPI, engine de batalha, sessões
│   │   ├── battle/    # engine.ts (cálculo de dano) + typeChart.ts
│   │   ├── pokemon/   # service.ts (busca + cache da PokeAPI)
│   │   └── routes/    # battle.ts e pokemon.ts
│   └── users/         # Service de usuários (Auth0 + Prisma)
│       ├── prisma/    # schema.prisma + migrations (SQLite)
│       └── src/       # /me, /me/teams (CRUD de times salvos)
└── frontend/
    └── src/
        ├── api/       # Clientes axios para battle e users
        ├── auth/      # Configuração do Auth0
        ├── battle/    # Espelho do engine (cálculo client-side opcional)
        ├── components/# TeamBuilder e BattleArena
        └── App.tsx    # Tela principal + login
```

### Por que três serviços?

Honestamente, principalmente pra exercitar separação de responsabilidades — é um trabalho de faculdade. Mas a divisão faz sentido:

- **Battle API** é stateless do ponto de vista de usuário (sessões in-memory, somem em 2h). Não precisa saber quem você é.
- **Users Service** cuida de autenticação e persistência. Tem banco de dados.
- **Gateway** centraliza CORS e roteamento, então o frontend só conhece um host.

## Stack

**Frontend**
- React 19 + Vite 8
- TypeScript
- `@auth0/auth0-react` para login
- Axios

**Backend (todos os serviços)**
- Node + TypeScript + Express
- `tsx` para dev com hot reload
- Zod para validação de env vars

**Específicos**
- Battle API: `axios` (PokeAPI) + `uuid` (sessões)
- Gateway: `http-proxy-middleware`
- Users: `@prisma/client` + SQLite + `express-oauth2-jwt-bearer` (Auth0)

## Como rodar

Você vai precisar de **4 terminais** (gateway, battle API, users, frontend) ou um `tmux`/`Procfile` da sua preferência.

### Pré-requisitos

- Node 20+
- Uma conta no [Auth0](https://auth0.com/) (o tier gratuito basta) — sem isso o login e o salvamento de times não funcionam, mas a batalha pública contra a IA funciona.

### 1. Clone e instale dependências

Cada serviço tem seu próprio `package.json`:

```bash
git clone <repo>
cd pokemon-showdown-ps

cd backend && npm install && cd ..
cd backend/gateway && npm install && cd ../..
cd backend/users && npm install && cd ../..
cd frontend && npm install && cd ..
```

### 2. Configure as variáveis de ambiente

Crie um `.env` em cada lugar:

**`backend/gateway/.env`**
```
PORT=8000
BATTLE_SERVICE_URL=http://localhost:3001
USERS_SERVICE_URL=http://localhost:8001
CORS_ORIGIN=http://localhost:5173
```

**`backend/users/.env`**
```
PORT=8001
AUTH0_DOMAIN=seu-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.pokemon-showdown-ps
DATABASE_URL=file:./dev.db
```

**`frontend/.env`**
```
VITE_AUTH0_DOMAIN=seu-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=seu_client_id
VITE_AUTH0_AUDIENCE=https://api.pokemon-showdown-ps
VITE_AUTH0_REDIRECT_URI=http://localhost:5173
VITE_GATEWAY_BASE_URL=http://localhost:8000/api
VITE_USERS_API_BASE_URL=http://localhost:8000/api/users
```

> No Auth0, cria uma **API** (com o identifier que vai virar `AUDIENCE`) e uma **Application SPA** apontando o callback/logout/origin para `http://localhost:5173`.

### 3. Rode os serviços

Em terminais separados:

```bash
# Terminal 1 — Battle API
cd backend && npm run dev

# Terminal 2 — Gateway
cd backend/gateway && npm run dev

# Terminal 3 — Users service (roda prisma db push automaticamente)
cd backend/users && npm run dev

# Terminal 4 — Frontend
cd frontend && npm run dev
```

Abra `http://localhost:5173` e bom proveito.

## Endpoints da Battle API

Todos sob `/api` no gateway (porta 8000).

| Método | Rota                       | O que faz                                                                |
|--------|----------------------------|--------------------------------------------------------------------------|
| GET    | `/pokemon/:name`           | Preview (stats + sprite) — sem moves, usado pelo team builder            |
| POST   | `/battle/start`            | Inicia uma batalha. Body: `{ playerTeam: string[6] }`                    |
| POST   | `/battle/:id/turn`         | Executa um turno. Body: `{ action: 'move', moveIndex }` ou `{ action: 'switch', switchTo }` |
| GET    | `/battle/:id`              | Estado atual da sessão                                                   |
| DELETE | `/battle/:id`              | Encerra e limpa a sessão                                                 |

## Endpoints do Users Service

Todos exigem `Authorization: Bearer <jwt-do-auth0>`.

| Método | Rota                  | O que faz                                            |
|--------|-----------------------|------------------------------------------------------|
| GET    | `/me`                 | Retorna o perfil do usuário logado (cria se não existe) |
| GET    | `/me/teams`           | Lista os times salvos                                |
| POST   | `/me/teams`           | Salva um time. Body: `{ name?, pokemonNames: string[6] }` |
| DELETE | `/me/teams/:teamId`   | Remove um time                                       |

## Detalhes do engine de batalha

A fórmula de dano segue a clássica (Gen V+):

```
base = ((2 * 50 / 5 + 2) * power * atk / def / 50) + 2
dano = base * STAB * efetividade * crítico * random(0.85–1.0)
```

- **Level fixo em 50** (como nos formatos competitivos do Showdown)
- **STAB**: 1.5x se o tipo do move bate com algum tipo do atacante
- **Crítico**: 1/16 de chance, multiplica por 1.5
- **Accuracy**: rolagem percentual; se passar, ataque conecta
- **Tipos**: tabela completa em [backend/src/battle/typeChart.ts](backend/src/battle/typeChart.ts)
- **Moves**: pega os 4 moves de maior level que aprende por level-up e que causam dano. Se faltar, completa com qualquer move de dano que tiver disponível.

A IA escolhe moves aleatoriamente. Sem estratégia. (Espaço pra melhorar, certo?)

## Limitações conhecidas / coisas que não tem

- Sem multiplayer — só você contra a IA
- Sem status conditions (paralisia, queimadura, etc.)
- Sem moves de status (boost de stats, healing)
- Sem held items, abilities, naturas, EVs/IVs customizáveis
- Sessões de batalha vivem em memória do processo da Battle API — reinício do servidor = batalhas perdidas
- A primeira chamada pra cada Pokémon é lenta (precisa buscar moves um por um na PokeAPI). Depois entra em cache.

## Scripts úteis

```bash
# Dentro de qualquer serviço backend
npm run dev      # tsx watch
npm run build    # compila TypeScript pra dist/
npm run start    # roda o build

# users service
npm run db:push      # aplica o schema sem criar migration
npm run db:migrate   # cria/aplica migration
npm run db:generate  # regenera o Prisma Client

# frontend
npm run dev      # vite
npm run build    # tsc + vite build
npm run lint     # eslint
npm run preview  # preview do build
```

## Créditos

- Dados de Pokémon: [PokeAPI](https://pokeapi.co/)
- Inspirado em [Pokémon Showdown](https://pokemonshowdown.com/)
- Pokémon é © Nintendo / Game Freak / Creatures
