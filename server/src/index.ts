import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { nutritionRouter } from './routes/nutrition.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.use('/api/nutrition', nutritionRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
});
