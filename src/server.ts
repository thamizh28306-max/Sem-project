import express from 'express';
import cors from 'cors';
import { placesRouter } from './routes/places';
import { listingsRouter } from './routes/listings';
import { predictRouter } from './routes/predict';
import { authRouter } from './routes/auth';
import { soilRouter } from './routes/soil';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS: allow frontend from file:// and local dev servers
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'null' // for file:// origins
  ],
  credentials: true
}));

app.use(express.json());

// --- API Routes ---
app.use('/api/auth', authRouter);
app.use('/api/listings', listingsRouter);
app.use('/api/predict', predictRouter);
app.use('/api/soil', soilRouter);
app.use('/api/places', placesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'DataZen API', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 DataZen API server running on http://localhost:${PORT}`);
});

export default app;
