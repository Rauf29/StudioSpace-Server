import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { connectDB } from './db.js';

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

app.post('/api/studios', verifyToken, async (req, res) => {
	try {
		const data = req.body;

		if (
			!data.title ||
			!data.category ||
			!data.hourlyRate ||
			!data.location ||
			!data.image ||
			!data.overview
		) {
			return res
				.status(400)
				.json({ message: 'Please provide all required fields' });
		}

		const newStudio = {
			title: data.title,
			category: data.category,
			hourlyRate: Number(data.hourlyRate),
			securityDeposit: Number(data.securityDeposit) || 0,
			maxCapacity: Number(data.maxCapacity) || 1,
			location: data.location,
			image: data.image,
			gallery: Array.isArray(data.gallery) ? data.gallery : [],
			amenities: Array.isArray(data.amenities) ? data.amenities : [],
			overview: data.overview,
			rating: 0,
			reviews: [],
			ownerEmail: req.user.email,
			ownerName: req.user.name,
			createdAt: new Date(),
		};

		const col = await studiosCol();
		const result = await col.insertOne(newStudio);

		res.status(201).json({
			message: 'Studio created successfully',
			insertedId: result.insertedId,
		});
	} catch (err) {
		res.status(500).json({ message: 'Failed to create studio' });
	}
});

app.put('/api/studios/:id', verifyToken, async (req, res) => {
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

		if (studio.ownerEmail !== req.user.email) {
			return res
				.status(403)
				.json({ message: 'Forbidden: not your studio' });
		}

		const data = req.body;
		const updatedData = {
			title: data.title,
			category: data.category,
			hourlyRate: Number(data.hourlyRate),
			securityDeposit: Number(data.securityDeposit) || 0,
			maxCapacity: Number(data.maxCapacity) || 1,
			location: data.location,
			image: data.image,
			gallery: Array.isArray(data.gallery)
				? data.gallery
				: studio.gallery,
			amenities: Array.isArray(data.amenities)
				? data.amenities
				: studio.amenities,
			overview: data.overview,
			updatedAt: new Date(),
		};

		await col.updateOne({ _id: new ObjectId(id) }, { $set: updatedData });

		res.json({ message: 'Studio updated successfully' });
	} catch (err) {
		res.status(500).json({ message: 'Failed to update studio' });
	}
});

app.delete('/api/studios/:id', verifyToken, async (req, res) => {
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

		if (studio.ownerEmail !== req.user.email) {
			return res
				.status(403)
				.json({ message: 'Forbidden: not your studio' });
		}

		await col.deleteOne({ _id: new ObjectId(id) });
		res.json({ message: 'Studio deleted successfully' });
	} catch {
		res.status(500).json({ message: 'Failed to delete studio' });
	}
});

app.get('/api/my-studios', verifyToken, async (req, res) => {
	try {
		const col = await studiosCol();
		const studios = await col
			.find({ ownerEmail: req.user.email })
			.sort({ createdAt: -1 })
			.toArray();
		res.json(studios);
	} catch (err) {
		res.status(500).json({ message: 'Failed to load your listings' });
	}
});

connectDB().then(() => {
	app.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);
	});
});

export default app;
