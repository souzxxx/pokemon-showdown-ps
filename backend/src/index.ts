import express from 'express';
import cors from 'cors';
import { battleRouter } from './routes/battle';
import { pokemonRouter } from './routes/pokemon';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/pokemon', pokemonRouter);
app.use('/api/battle', battleRouter);

app.listen(PORT, () => {
  console.log(`\nPokemon Battle API → http://localhost:${PORT}\n`);
  console.log('Endpoints:');
  console.log('  GET    /api/pokemon/:name           – prévia de um Pokémon (team builder)');
  console.log('  POST   /api/battle/start            – iniciar batalha  { playerTeam: string[6] }');
  console.log('  POST   /api/battle/:id/turn         – executar ação    { action, moveIndex | switchTo }');
  console.log('  GET    /api/battle/:id              – estado atual da batalha');
  console.log('  DELETE /api/battle/:id              – encerrar sessão\n');
});
