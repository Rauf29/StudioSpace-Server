import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { connectDB } from './db.js';
import { verifyToken } from './middleware/verifyToken.js';

const app = express();
const PORT = process.env.PORT;
const studiosCol = async () => (await connectDB()).collection('studios');

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

app.get('api/featured-studios', async (req, res) => {
	try {
		const col = await studiosCol();
		const studios = await col
			.find()
			.sort({ rating: -1 })
			.limit(6)
			.toArray();
		res.json(studios);
	} catch (err) {
		res.status(500).json({ error: 'Failed to load featured studios' });
	}
});

app.get('/api/studios', async (req, res) => {
	try {
		const { category, search, sort } = req.query;
		let query = {};
		if (category) {
			query.category = category;
		}
		if (search) {
			query.title = { $regex: search, $options: 'i' };
		}
		let sortQuery = { createdAt: -1 };
		if (sort === 'price-asc') sortQuery = { hourlyRate: 1 };
		if (sort === 'price-desc') sortQuery = { hourlyRate: -1 };
		const col = await studiosCol();
		const studios = await col.find(query).sort(sortQuery).toArray();
		res.json(studios);
	} catch (err) {
		res.status(500).json({ message: 'Failed to load studios' });
	}
});

app.get('/api/studios/:id', async (req, res) => {
	try {
		const { id } = req.params;
		if (!ObjectId.isValid(id)) {
			return res.status(400).json({ message: 'Invalid studio id' });
		}
		const col = await studiosCol();
		const studio = await col.findOne({ _id: new ObjectId(id) });
		if (!studio) {
			return res.status(404).json({ message: 'Studio not found' });
		}
		res.json(studio);
	} catch (err) {
		res.status(500).json({ message: 'Failed to load studio' });
	}
});

app.post('/api/auth/logout', (req, res) => {
	res.clearCookie('token');
	res.json({ message: 'Logged out successfully' });
});

app.get('/api/me', verifyToken, (req, res) => {
	res.json(req.user);
});

connectDB().then(() => {
	app.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);
	});
});

export default app;
