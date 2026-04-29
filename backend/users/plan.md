 Plano — Atualizar backend/users/plan.md para refletir mudanças do código
                                     
 Context

 O backend/users/plan.md foi escrito quando todas as pastas de backend estavam vazias e descrevia o serviço de users em Python + FastAPI +
 SQLAlchemy + Alembic + python-jose. Desde então, o código evoluiu numa direção diferente:

 - backend/package.json instalou stack Node + TypeScript + Express + axios (pokemon-battle-api, scripts tsx watch src/index.ts).
 - backend/src/ já contém um servidor Express com rotas /api/pokemon e /api/battle (src/index.ts, src/routes/battle.ts,
 src/pokemon/service.ts, src/battle/engine.ts, src/battle/typeChart.ts).
 - As pastas backend/pokemons/ e backend/battles/ foram removidas; sobrou apenas backend/users/{plan.md, penis.md} vazias de código.
 - Frontend (frontend/src/) já consome a API atual via axios (api/client.ts, api/battleApi.ts, api/pokemon.ts,
 components/{BattleArena,TeamBuilder}.tsx).
 - Não há nenhum Postgres, ORM, JWT, Auth0 — toda a parte de auth/users segue a fazer.

 Decisões alinhadas com o usuário nesta conversa:
 - O serviço de users será Node + TypeScript + Express (substituindo Python/FastAPI do plano original).
 - A arquitetura continua sendo 3 serviços separados: backend/users será um serviço Node independente com seu próprio package.json/Dockerfile,
  ao lado do backend monolítico Node atual. Esta etapa cobre apenas users + autenticação Auth0.
 - O endpoint POST /api/battle/start (no outro serviço) eventualmente passará a aceitar team_id mantendo compatibilidade com playerTeam:
 string[]. Esse trabalho fica fora do escopo desta etapa.

 Outcome desta etapa: subir o serviço backend/users em Node/Express, com tabelas Postgres, validação de JWT Auth0, e endpoints /me,
 /me/pokemons, /me/teams, /me/teams/:id/slots/:slot. E atualizar backend/users/plan.md para refletir esta nova realidade.

 ---
 O que muda em relação ao plan.md atual

 ┌─────────────────────┬─────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────┐
 │        Item         │                    plan.md atual                    │                      Plano atualizado                      │
 ├─────────────────────┼─────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
 │ Linguagem/framework │ Python + FastAPI                                    │ Node + TypeScript + Express                                │
 ├─────────────────────┼─────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
 │ ORM/migrações       │ SQLAlchemy 2.0 + Alembic                            │ Prisma (schema-first, migrate dev/deploy)                  │
 ├─────────────────────┼─────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
 │ Validação           │ Pydantic v2                                         │ Zod                                                        │
 ├─────────────────────┼─────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
 │ JWT Auth0           │ python-jose + JWKS manual                           │ express-oauth2-jwt-bearer (lib oficial Auth0; valida       │
 │                     │                                                     │ JWKS/iss/aud/exp/RS256)                                    │
 ├─────────────────────┼─────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
 │ HTTP client         │ httpx.AsyncClient                                   │ axios (já em uso no monolito)                              │
 │ (PokeAPI)           │                                                     │                                                            │
 ├─────────────────────┼─────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
 │ Estrutura           │ backend/users/app/{models,schemas,routers,services} │ backend/users/src/{routes,services,middleware,db,schemas}  │
 ├─────────────────────┼─────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
 │ Migrações           │ alembic/versions/0001_init.py                       │ prisma/migrations/<timestamp>_init/                        │
 └─────────────────────┴─────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────┘

 O modelo de dados (4 tabelas: users, trainer_pokemons, teams, team_members), os endpoints e o fluxo de auth seguem idênticos ao plano
 original — só muda a tradução para o ecossistema Node.

 ---
 Stack final do serviço

 - Runtime: Node 20+, TypeScript 5.3
 - HTTP: express 4
 - DB driver/ORM: prisma + @prisma/client (Postgres)
 - JWT: express-oauth2-jwt-bearer (Auth0 oficial, faz cache de JWKS internamente)
 - Validação: zod
 - HTTP client externo: axios (PokeAPI)
 - Config: dotenv + um helper env.ts que valida com zod
 - Dev: tsx watch

 ---
 Estrutura backend/users/

 backend/users/
 ├── package.json                # express, prisma, zod, axios, jwt-bearer, dotenv, tsx
 ├── tsconfig.json               # mirror do backend/tsconfig.json (CommonJS, strict)
 ├── .env.example                # AUTH0_DOMAIN, AUTH0_AUDIENCE, DATABASE_URL, PORT
 ├── Dockerfile
 ├── docker-compose.yml          # postgres + serviço (dev)
 ├── prisma/
 │   └── schema.prisma           # 4 modelos: User, TrainerPokemon, Team, TeamMember
 └── src/
     ├── index.ts                # Express app, middlewares, mount routers
     ├── env.ts                  # validação de env vars com zod
     ├── db.ts                   # PrismaClient singleton
     ├── middleware/
     │   ├── auth.ts             # auth = jwt({...}); requireAuth middleware
     │   └── currentUser.ts      # upsert por auth0_sub; injeta req.currentUser
     ├── schemas/                # zod schemas para body/params
     │   ├── pokemon.ts
     │   └── team.ts
     ├── services/
     │   └── pokeapi.ts          # validateSpecies(pokeapi_id) — axios + cache LRU em memória
     └── routes/
         ├── me.ts               # GET/PATCH /me
         ├── pokemons.ts         # CRUD /me/pokemons
         └── teams.ts            # CRUD /me/teams + slots

 Reaproveitamento mínimo do monolito atual: o módulo services/pokeapi.ts segue o mesmo padrão de backend/src/pokemon/service.ts (axios.create
 + cache em Map), mas como o serviço é separado por decisão do usuário, é cópia adaptada — só precisamos de validateSpecies(id) → boolean, não
  da hidratação completa de stats/moves.

 ---
 Modelo de dados (Prisma)

 Mesmas 4 tabelas, traduzidas para schema.prisma. Pontos de tradução:

 - uuid PK → @id @default(uuid()) (Prisma gera UUID v4 nativamente).
 - citext (email/username) → não é nativo em Prisma; usar String @unique + criar a extensão citext manualmente na primeira migração via SQL
 (prisma migrate aceita SQL custom em migration.sql). Alternativa mais simples: armazenar lowercase e validar/normalizar no app. Recomendação:
  lowercase no app, sem citext (menos magia).
 - jsonb (moves, ivs, evs) → Json no Prisma.
 - CHECK constraints (level BETWEEN 1 AND 100, slot BETWEEN 1 AND 6) → Prisma não suporta CHECK declarativo; adicionar via SQL custom na
 migração inicial e validar no schema Zod (defesa em profundidade).
 - ON DELETE CASCADE → onDelete: Cascade no Prisma.
 - UNIQUE (user_id, name) → @@unique([userId, name]).
 - PRIMARY KEY (team_id, slot) → @@id([teamId, slot]).
 - UNIQUE (team_id, trainer_pokemon_id) → @@unique([teamId, trainerPokemonId]).
 - Validação cross-table "trainer_pokemon.user_id == team.user_id" → app-level no service (não tem como expressar declarativamente em Prisma;
 acrescentar checagem antes do create/upsert em routes/teams.ts).

 Limites de domínio (level 1–100, moves ≤ 4, nickname ≤ 24, name 1–32, slot 1–6, evs soma ≤ 510) → schemas Zod em src/schemas/.

 ---
 Auth flow

 1. Frontend usa @auth0/auth0-react (PKCE, sem secret no browser) — instalação no frontend é preparação, não é o foco desta etapa.
 2. Frontend envia Authorization: Bearer <jwt> para backend/users.
 3. middleware/auth.ts usa auth({ audience: env.AUTH0_AUDIENCE, issuerBaseURL: \https://${env.AUTH0_DOMAIN}/`, tokenSigningAlg: 'RS256'
 })daexpress-oauth2-jwt-bearer`. JWKS é cacheado pela própria lib; assinatura/iss/aud/exp validados; em erro retorna 401 automaticamente.
 4. middleware/currentUser.ts roda depois de requireAuth: lê req.auth.payload.sub, faz prisma.user.upsert({ where: { auth0Sub: sub }, update:
 {}, create: { auth0Sub: sub, email: payload.email, username: slug(payload.email) } }), injeta em req.currentUser.
 5. Rotas /me/* montadas com ambos os middlewares; usam req.currentUser.id para filtrar todos os queries (isolamento por treinador).
 6. Outros serviços (battle, pokemons) reutilizarão a mesma lib + mesmo audience quando precisarem — não é trabalho desta etapa.

 ---
 Endpoints (sem mudança em relação ao plan.md original)

 ┌────────┬───────────────────────────┬─────────────────────────────────────────────────────────────────────────────────┐
 │ Método │           Rota            │                                      Notas                                      │
 ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
 │ GET    │ /me                       │ upsert no primeiro acesso (já tratado pelo middleware currentUser)              │
 ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
 │ PATCH  │ /me                       │ { username?, avatarUrl? } — Zod valida unicidade no DB                          │
 ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
 │ GET    │ /me/pokemons              │ lista                                                                           │
 ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
 │ POST   │ /me/pokemons              │ valida pokeapi_id via services/pokeapi.ts antes do insert (404 → 422)           │
 ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
 │ PATCH  │ /me/pokemons/:id          │ parcial; checa ownership                                                        │
 ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
 │ DELETE │ /me/pokemons/:id          │ cascateia para team_members                                                     │
 ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
 │ GET    │ /me/teams                 │ lista                                                                           │
 ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
 │ POST   │ /me/teams                 │ { name }                                                                        │
 ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
 │ GET    │ /me/teams/:id             │ inclui members com join em trainer_pokemons                                     │
 ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
 │ PATCH  │ /me/teams/:id             │ renomear                                                                        │
 ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
 │ DELETE │ /me/teams/:id             │                                                                                 │
 ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
 │ PUT    │ /me/teams/:id/slots/:slot │ { trainer_pokemon_id } — valida ownership cruzado (TP.user_id === Team.user_id) │
 ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
 │ DELETE │ /me/teams/:id/slots/:slot │ esvazia                                                                         │
 └────────┴───────────────────────────┴─────────────────────────────────────────────────────────────────────────────────┘

 Toda rota /me/* passa por requireAuth + currentUser; toda query filtra por req.currentUser.id.

 ---
 Arquivos críticos a criar/alterar

 Criar (novo serviço, nada existe ainda):
 - backend/users/package.json, tsconfig.json, .env.example, Dockerfile, docker-compose.yml
 - backend/users/prisma/schema.prisma
 - backend/users/src/index.ts, env.ts, db.ts
 - backend/users/src/middleware/{auth.ts, currentUser.ts}
 - backend/users/src/schemas/{pokemon.ts, team.ts}
 - backend/users/src/services/pokeapi.ts
 - backend/users/src/routes/{me.ts, pokemons.ts, teams.ts}

 Alterar:
 - backend/users/plan.md — substituir o conteúdo pelo plano novo (Node/Prisma) para evitar que o doc desencaminhe. Este arquivo é a única
 alteração documental necessária; a mudança de stack invalida ~todo o conteúdo atual.

 Remover:
 - backend/users/penis.md (placeholder vazio, 1 linha — pode sair junto com a primeira leva de código).

 Não tocar nesta etapa:
 - backend/src/** (monolito de pokemon/battle) — fica para a próxima etapa, quando battle aceitar team_id.
 - frontend/** — @auth0/auth0-react + Auth0Provider em main.tsx é trabalho de etapa de frontend, não desta.

 ---
 Padrões a seguir

 - Cópia adaptada do pokeapi.ts: backend/src/pokemon/service.ts:1-13 mostra o padrão axios.create({ baseURL: 'https://pokeapi.co/api/v2',
 timeout: 15000 }) + cache = new Map(). Reusar essa forma em backend/users/src/services/pokeapi.ts, mas só com a função validateSpecies(id:
 number): Promise<boolean> (404 → false, 200 → true).
 - tsconfig.json: espelhar backend/tsconfig.json (CommonJS, ES2022, strict, esModuleInterop) para consistência.
 - Estilo de rotas: backend/src/routes/battle.ts mostra o padrão Express + tipagem de body com asserts manuais. Substituir os asserts por
 schema.parse(req.body) (Zod) — mais limpo e dá 422 automático ao falhar.

 ---
 Verificação end-to-end

 1. cd backend/users && docker compose up -d postgres → Postgres em localhost:5432.
 2. npx prisma migrate dev --name init → cria as 4 tabelas + extensão citext (se mantida) + CHECK constraints via SQL custom; \dt no psql
 confirma.
 3. npm run dev (script tsx watch src/index.ts) → serviço sobe em http://localhost:8001.
 4. No Auth0 dashboard → APIs → Test → copiar access_token.
 5. curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/me → cria user local e retorna 200 com { id, auth0Sub, email, username, ...
 }.
 6. curl -X POST .../me/pokemons -H "Authorization: Bearer $TOKEN" -d '{"pokeapiId":6,"nickname":"Charry","level":55}' → 201; pokeapiId: 9999
 → 422.
 7. POST /me/teams {"name":"OU"} → PUT /me/teams/<id>/slots/1 {"trainerPokemonId":"<uuid>"} → GET /me/teams/<id> mostra slot preenchido com
 join no trainer_pokemons.
 8. Repetir o passo 5 com um segundo user (token diferente) e tentar GET /me/pokemons/<id-do-user-1> → 404 (isolamento via
     logica de autenticação com auth0.
     · Como o endpoint POST /api/battle/start deve evoluir? → Aceitar team_id e manter compatibilidade com nomes (Recommended)

● Decisões registradas. Vou escrever o plano final.

● Updated plan
  ⎿  /plan to preview

● User approved Claude's plan           
  ⎿  Plan saved to: ~\.claude\plans\va-ate-o-backend-users-plan-md-modular-knuth.md · /plan to edit
     Plano — Atualizar backend/users/plan.md para refletir mudanças do código                                                                  
   
     Context                                                                                                                                   
                                                                                                                                             
     O backend/users/plan.md foi escrito quando todas as pastas de backend estavam vazias e descrevia o serviço de users em Python + FastAPI + 
     SQLAlchemy + Alembic + python-jose. Desde então, o código evoluiu numa direção diferente:

     - backend/package.json instalou stack Node + TypeScript + Express + axios (pokemon-battle-api, scripts tsx watch src/index.ts).
     - backend/src/ já contém um servidor Express com rotas /api/pokemon e /api/battle (src/index.ts, src/routes/battle.ts,
     src/pokemon/service.ts, src/battle/engine.ts, src/battle/typeChart.ts).
     - As pastas backend/pokemons/ e backend/battles/ foram removidas; sobrou apenas backend/users/{plan.md, penis.md} vazias de código.
     - Frontend (frontend/src/) já consome a API atual via axios (api/client.ts, api/battleApi.ts, api/pokemon.ts,
     components/{BattleArena,TeamBuilder}.tsx).
     - Não há nenhum Postgres, ORM, JWT, Auth0 — toda a parte de auth/users segue a fazer.

     Decisões alinhadas com o usuário nesta conversa:
     - O serviço de users será Node + TypeScript + Express (substituindo Python/FastAPI do plano original).
     - A arquitetura continua sendo 3 serviços separados: backend/users será um serviço Node independente com seu próprio
     package.json/Dockerfile, ao lado do backend monolítico Node atual. Esta etapa cobre apenas users + autenticação Auth0.
     - O endpoint POST /api/battle/start (no outro serviço) eventualmente passará a aceitar team_id mantendo compatibilidade com playerTeam:
     string[]. Esse trabalho fica fora do escopo desta etapa.

     Outcome desta etapa: subir o serviço backend/users em Node/Express, com tabelas Postgres, validação de JWT Auth0, e endpoints /me,
     /me/pokemons, /me/teams, /me/teams/:id/slots/:slot. E atualizar backend/users/plan.md para refletir esta nova realidade.

     ---
     O que muda em relação ao plan.md atual

     ┌─────────────────────┬─────────────────────────────────────────────────────┬────────────────────────────────────────────────────────────┐
     │        Item         │                    plan.md atual                    │                      Plano atualizado                      │
     ├─────────────────────┼─────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
     │ Linguagem/framework │ Python + FastAPI                                    │ Node + TypeScript + Express                                │
     ├─────────────────────┼─────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
     │ ORM/migrações       │ SQLAlchemy 2.0 + Alembic                            │ Prisma (schema-first, migrate dev/deploy)                  │
     ├─────────────────────┼─────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
     │ Validação           │ Pydantic v2                                         │ Zod                                                        │
     ├─────────────────────┼─────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
     │ JWT Auth0           │ python-jose + JWKS manual                           │ express-oauth2-jwt-bearer (lib oficial Auth0; valida       │
     │                     │                                                     │ JWKS/iss/aud/exp/RS256)                                    │
     ├─────────────────────┼─────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
     │ HTTP client         │ httpx.AsyncClient                                   │ axios (já em uso no monolito)                              │
     │ (PokeAPI)           │                                                     │                                                            │
     ├─────────────────────┼─────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
     │ Estrutura           │ backend/users/app/{models,schemas,routers,services} │ backend/users/src/{routes,services,middleware,db,schemas}  │
     ├─────────────────────┼─────────────────────────────────────────────────────┼────────────────────────────────────────────────────────────┤
     │ Migrações           │ alembic/versions/0001_init.py                       │ prisma/migrations/<timestamp>_init/                        │
     └─────────────────────┴─────────────────────────────────────────────────────┴────────────────────────────────────────────────────────────┘

     O modelo de dados (4 tabelas: users, trainer_pokemons, teams, team_members), os endpoints e o fluxo de auth seguem idênticos ao plano
     original — só muda a tradução para o ecossistema Node.

     ---
     Stack final do serviço

     - Runtime: Node 20+, TypeScript 5.3
     - HTTP: express 4
     - DB driver/ORM: prisma + @prisma/client (Postgres)
     - JWT: express-oauth2-jwt-bearer (Auth0 oficial, faz cache de JWKS internamente)
     - Validação: zod
     - HTTP client externo: axios (PokeAPI)
     - Config: dotenv + um helper env.ts que valida com zod
     - Dev: tsx watch

     ---
     Estrutura backend/users/

     backend/users/
     ├── package.json                # express, prisma, zod, axios, jwt-bearer, dotenv, tsx
     ├── tsconfig.json               # mirror do backend/tsconfig.json (CommonJS, strict)
     ├── .env.example                # AUTH0_DOMAIN, AUTH0_AUDIENCE, DATABASE_URL, PORT
     ├── Dockerfile
     ├── docker-compose.yml          # postgres + serviço (dev)
     ├── prisma/
     │   └── schema.prisma           # 4 modelos: User, TrainerPokemon, Team, TeamMember
     └── src/
         ├── index.ts                # Express app, middlewares, mount routers
         ├── env.ts                  # validação de env vars com zod
         ├── db.ts                   # PrismaClient singleton
         ├── middleware/
         │   ├── auth.ts             # auth = jwt({...}); requireAuth middleware
         │   └── currentUser.ts      # upsert por auth0_sub; injeta req.currentUser
         ├── schemas/                # zod schemas para body/params
         │   ├── pokemon.ts
         │   └── team.ts
         ├── services/
         │   └── pokeapi.ts          # validateSpecies(pokeapi_id) — axios + cache LRU em memória
         └── routes/
             ├── me.ts               # GET/PATCH /me
             ├── pokemons.ts         # CRUD /me/pokemons
             └── teams.ts            # CRUD /me/teams + slots

     Reaproveitamento mínimo do monolito atual: o módulo services/pokeapi.ts segue o mesmo padrão de backend/src/pokemon/service.ts
     (axios.create + cache em Map), mas como o serviço é separado por decisão do usuário, é cópia adaptada — só precisamos de
     validateSpecies(id) → boolean, não da hidratação completa de stats/moves.

     ---
     Modelo de dados (Prisma)

     Mesmas 4 tabelas, traduzidas para schema.prisma. Pontos de tradução:

     - uuid PK → @id @default(uuid()) (Prisma gera UUID v4 nativamente).
     - citext (email/username) → não é nativo em Prisma; usar String @unique + criar a extensão citext manualmente na primeira migração via SQL
      (prisma migrate aceita SQL custom em migration.sql). Alternativa mais simples: armazenar lowercase e validar/normalizar no app.
     Recomendação: lowercase no app, sem citext (menos magia).
     - jsonb (moves, ivs, evs) → Json no Prisma.
     - CHECK constraints (level BETWEEN 1 AND 100, slot BETWEEN 1 AND 6) → Prisma não suporta CHECK declarativo; adicionar via SQL custom na
     migração inicial e validar no schema Zod (defesa em profundidade).
     - ON DELETE CASCADE → onDelete: Cascade no Prisma.
     - UNIQUE (user_id, name) → @@unique([userId, name]).
     - PRIMARY KEY (team_id, slot) → @@id([teamId, slot]).
     - UNIQUE (team_id, trainer_pokemon_id) → @@unique([teamId, trainerPokemonId]).
     - Validação cross-table "trainer_pokemon.user_id == team.user_id" → app-level no service (não tem como expressar declarativamente em
     Prisma; acrescentar checagem antes do create/upsert em routes/teams.ts).

     Limites de domínio (level 1–100, moves ≤ 4, nickname ≤ 24, name 1–32, slot 1–6, evs soma ≤ 510) → schemas Zod em src/schemas/.

     ---
     Auth flow

     1. Frontend usa @auth0/auth0-react (PKCE, sem secret no browser) — instalação no frontend é preparação, não é o foco desta etapa.
     2. Frontend envia Authorization: Bearer <jwt> para backend/users.
     3. middleware/auth.ts usa auth({ audience: env.AUTH0_AUDIENCE, issuerBaseURL: \https://${env.AUTH0_DOMAIN}/`, tokenSigningAlg: 'RS256'
     })daexpress-oauth2-jwt-bearer`. JWKS é cacheado pela própria lib; assinatura/iss/aud/exp validados; em erro retorna 401 automaticamente.
     4. middleware/currentUser.ts roda depois de requireAuth: lê req.auth.payload.sub, faz prisma.user.upsert({ where: { auth0Sub: sub },
     update: {}, create: { auth0Sub: sub, email: payload.email, username: slug(payload.email) } }), injeta em req.currentUser.
     5. Rotas /me/* montadas com ambos os middlewares; usam req.currentUser.id para filtrar todos os queries (isolamento por treinador).
     6. Outros serviços (battle, pokemons) reutilizarão a mesma lib + mesmo audience quando precisarem — não é trabalho desta etapa.

     ---
     Endpoints (sem mudança em relação ao plan.md original)

     ┌────────┬───────────────────────────┬─────────────────────────────────────────────────────────────────────────────────┐
     │ Método │           Rota            │                                      Notas                                      │
     ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
     │ GET    │ /me                       │ upsert no primeiro acesso (já tratado pelo middleware currentUser)              │
     ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
     │ PATCH  │ /me                       │ { username?, avatarUrl? } — Zod valida unicidade no DB                          │
     ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
     │ GET    │ /me/pokemons              │ lista                                                                           │
     ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
     │ POST   │ /me/pokemons              │ valida pokeapi_id via services/pokeapi.ts antes do insert (404 → 422)           │
     ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
     │ PATCH  │ /me/pokemons/:id          │ parcial; checa ownership                                                        │
     ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
     │ DELETE │ /me/pokemons/:id          │ cascateia para team_members                                                     │
     ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
     │ GET    │ /me/teams                 │ lista                                                                           │
     ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
     │ POST   │ /me/teams                 │ { name }                                                                        │
     ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
     │ GET    │ /me/teams/:id             │ inclui members com join em trainer_pokemons                                     │
     ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
     │ PATCH  │ /me/teams/:id             │ renomear                                                                        │
     ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
     │ DELETE │ /me/teams/:id             │                                                                                 │
     ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
     │ PUT    │ /me/teams/:id/slots/:slot │ { trainer_pokemon_id } — valida ownership cruzado (TP.user_id === Team.user_id) │
     ├────────┼───────────────────────────┼─────────────────────────────────────────────────────────────────────────────────┤
     │ DELETE │ /me/teams/:id/slots/:slot │ esvazia                                                                         │
     └────────┴───────────────────────────┴─────────────────────────────────────────────────────────────────────────────────┘

     Toda rota /me/* passa por requireAuth + currentUser; toda query filtra por req.currentUser.id.

     ---
     Arquivos críticos a criar/alterar

     Criar (novo serviço, nada existe ainda):
     - backend/users/package.json, tsconfig.json, .env.example, Dockerfile, docker-compose.yml
     - backend/users/prisma/schema.prisma
     - backend/users/src/index.ts, env.ts, db.ts
     - backend/users/src/middleware/{auth.ts, currentUser.ts}
     - backend/users/src/schemas/{pokemon.ts, team.ts}
     - backend/users/src/services/pokeapi.ts
     - backend/users/src/routes/{me.ts, pokemons.ts, teams.ts}

     Alterar:
     - backend/users/plan.md — substituir o conteúdo pelo plano novo (Node/Prisma) para evitar que o doc desencaminhe. Este arquivo é a única
     alteração documental necessária; a mudança de stack invalida ~todo o conteúdo atual.

     Remover:
     - backend/users/penis.md (placeholder vazio, 1 linha — pode sair junto com a primeira leva de código).

     Não tocar nesta etapa:
     - backend/src/** (monolito de pokemon/battle) — fica para a próxima etapa, quando battle aceitar team_id.
     - frontend/** — @auth0/auth0-react + Auth0Provider em main.tsx é trabalho de etapa de frontend, não desta.

     ---
     Padrões a seguir

     - Cópia adaptada do pokeapi.ts: backend/src/pokemon/service.ts:1-13 mostra o padrão axios.create({ baseURL: 'https://pokeapi.co/api/v2',
     timeout: 15000 }) + cache = new Map(). Reusar essa forma em backend/users/src/services/pokeapi.ts, mas só com a função validateSpecies(id:
      number): Promise<boolean> (404 → false, 200 → true).
     - tsconfig.json: espelhar backend/tsconfig.json (CommonJS, ES2022, strict, esModuleInterop) para consistência.
     - Estilo de rotas: backend/src/routes/battle.ts mostra o padrão Express + tipagem de body com asserts manuais. Substituir os asserts por
     schema.parse(req.body) (Zod) — mais limpo e dá 422 automático ao falhar.

     ---
     Verificação end-to-end

     1. cd backend/users && docker compose up -d postgres → Postgres em localhost:5432.
     2. npx prisma migrate dev --name init → cria as 4 tabelas + extensão citext (se mantida) + CHECK constraints via SQL custom; \dt no psql
     confirma.
     3. npm run dev (script tsx watch src/index.ts) → serviço sobe em http://localhost:8001.
     4. No Auth0 dashboard → APIs → Test → copiar access_token.
     5. curl -H "Authorization: Bearer $TOKEN" http://localhost:8001/me → cria user local e retorna 200 com { id, auth0Sub, email, username,
     ... }.
     6. curl -X POST .../me/pokemons -H "Authorization: Bearer $TOKEN" -d '{"pokeapiId":6,"nickname":"Charry","level":55}' → 201; pokeapiId:
     9999 → 422.
     7. POST /me/teams {"name":"OU"} → PUT /me/teams/<id>/slots/1 {"trainerPokemonId":"<uuid>"} → GET /me/teams/<id> mostra slot preenchido com
      join no trainer_pokemons.
     8. Repetir o passo 5 com um segundo user (token diferente) e tentar GET /me/pokemons/<id-do-user-1> → 404 (isolamento via
     req.currentUser.id).
     9. Token expirado / aud errado → 401 automático pela lib Auth0.