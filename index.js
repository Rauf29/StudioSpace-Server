import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { connectDB } from './db.js';

const app = express();
const PORT = process.env.PORT;

app.set('trust proxy', 1);

app.use(
	cors({
		origin: process.env.CLIENT_URL,
		credentials: true,
	}),
);
app.use(express.json());
app.use(cookieParser());

app.get('/', (req, res) => {
	res.send('StudioSpace server is running');
	console.log('StudioSpace server is running');
});

app.get('/api/health', (req, res) => {
	res.json({ status: 'ok', time: new Date().toISOString() });
});

connectDB().then(() => {
	app.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);
	});
});

export default app;
