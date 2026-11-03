import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { ObjectId } from 'mongodb';
import { connectDB } from './db.js';
import { verifyToken } from './middleware/verifyToken.js';

const app = express();
const PORT = process.env.PORT || 5001;
const studiosCol = async () => (await connectDB()).collection('studios');
const bookingsCol = async () => (await connectDB()).collection('bookings');

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

app.get('/api/featured-studios', async (req, res) => {
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
		const { category, search, location, sort } = req.query;
		let query = {};
		if (
			category &&
			category !== 'All Categories' &&
			category !== 'All Spaces'
		) {
			query.category = category;
		}
		if (location && location !== 'All Locations') {
			query.location = { $regex: location, $options: 'i' };
		}
		if (search && search.trim()) {
			query.$or = [
				{ title: { $regex: search.trim(), $options: 'i' } },
				{ location: { $regex: search.trim(), $options: 'i' } },
				{ overview: { $regex: search.trim(), $options: 'i' } },
			];
		}
		let sortQuery = { createdAt: -1 };
		if (sort === 'price-asc') sortQuery = { hourlyRate: 1 };
		if (sort === 'price-desc') sortQuery = { hourlyRate: -1 };
		if (sort === 'rating') sortQuery = { rating: -1 };
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
		const updateData = {
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

		await col.updateOne({ _id: new ObjectId(id) }, { $set: updateData });

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
	} catch (err) {
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

app.post('/api/bookings', verifyToken, async (req, res) => {
	try {
		const { studioId, date, startTime, endTime } = req.body;

		if (!studioId || !date || !startTime || !endTime) {
			return res.status(400).json({ message: 'All fields are required' });
		}

		if (!ObjectId.isValid(studioId)) {
			return res.status(400).json({ message: 'Invalid studio id' });
		}

		if (startTime >= endTime) {
			return res
				.status(400)
				.json({ message: 'End time must be after start time' });
		}

		const studios = await studiosCol();
		const studio = await studios.findOne({ _id: new ObjectId(studioId) });

		if (!studio) {
			return res.status(404).json({ message: 'Studio not found' });
		}

		if (studio.ownerEmail === req.user.email) {
			return res
				.status(400)
				.json({ message: 'You cannot book your own studio' });
		}

		const col = await bookingsCol();
		const clash = await col.findOne({
			studioId,
			date,
			status: 'Confirmed',
			startTime: { $lt: endTime },
			endTime: { $gt: startTime },
		});

		if (clash) {
			return res.status(409).json({
				message:
					'This time slot is already booked. Please choose a different time.',
			});
		}

		const [startHour, startMin] = startTime.split(':').map(Number);
		const [endHour, endMin] = endTime.split(':').map(Number);
		const totalHours =
			(endHour * 60 + endMin - (startHour * 60 + startMin)) / 60;
		const totalPrice = totalHours * studio.hourlyRate;

		const booking = {
			studioId: studio._id.toString(),
			studioTitle: studio.title,
			studioImage: studio.image,
			hostEmail: studio.ownerEmail,
			userEmail: req.user.email,
			userName: req.user.name,
			date,
			startTime,
			endTime,
			hours: totalHours,
			totalPrice,
			status: 'Pending',
			createdAt: new Date(),
		};

		const result = await col.insertOne(booking);

		res.status(201).json({
			message: 'Booking requested successfully',
			insertedId: result.insertedId,
		});
	} catch (err) {
		res.status(500).json({ message: 'Failed to create booking' });
	}
});

app.get('/api/my-bookings', verifyToken, async (req, res) => {
	try {
		const col = await bookingsCol();
		const bookings = await col
			.find({ userEmail: req.user.email })
			.sort({ createdAt: -1 })
			.toArray();

		res.json(bookings);
	} catch (err) {
		res.status(500).json({ message: 'Failed to load bookings' });
	}
});

app.patch('/api/bookings/:id/cancel', verifyToken, async (req, res) => {
	try {
		const { id } = req.params;

		if (!ObjectId.isValid(id)) {
			return res.status(400).json({ message: 'Invalid booking id' });
		}

		const col = await bookingsCol();
		const booking = await col.findOne({ _id: new ObjectId(id) });

		if (!booking) {
			return res.status(404).json({ message: 'Booking not found' });
		}

		if (booking.userEmail !== req.user.email) {
			return res.status(403).json({ message: 'Forbidden' });
		}

		if (booking.status !== 'Pending') {
			return res
				.status(400)
				.json({ message: 'Only pending bookings can be cancelled' });
		}

		await col.updateOne(
			{ _id: new ObjectId(id) },
			{ $set: { status: 'Cancelled' } },
		);
		res.json({ message: 'Booking cancelled successfully' });
	} catch (err) {
		res.status(500).json({ message: 'Failed to cancel booking' });
	}
});

app.get('/api/host-bookings', verifyToken, async (req, res) => {
	try {
		const col = await bookingsCol();
		const bookings = await col
			.find({ hostEmail: req.user.email })
			.sort({ createdAt: -1 })
			.toArray();

		res.json(bookings);
	} catch (err) {
		res.status(500).json({ message: 'Failed to load host bookings' });
	}
});

app.patch('/api/bookings/:id/status', verifyToken, async (req, res) => {
	try {
		const { id } = req.params;
		const { status } = req.body;

		if (!['Confirmed', 'Completed', 'Cancelled'].includes(status)) {
			return res.status(400).json({ message: 'Invalid status' });
		}

		if (!ObjectId.isValid(id)) {
			return res.status(400).json({ message: 'Invalid booking id' });
		}

		const col = await bookingsCol();
		const booking = await col.findOne({ _id: new ObjectId(id) });

		if (!booking) {
			return res.status(404).json({ message: 'Booking not found' });
		}

		if (booking.hostEmail !== req.user.email) {
			return res.status(403).json({ message: 'Forbidden' });
		}

		await col.updateOne({ _id: new ObjectId(id) }, { $set: { status } });
		res.json({ message: `Booking marked as ${status}` });
	} catch (err) {
		res.status(500).json({ message: 'Failed to update booking status' });
	}
});

app.post('/api/studios/:id/reviews', verifyToken, async (req, res) => {
	try {
		const { id } = req.params;
		const { rating, comment, bookingId } = req.body;

		const numRating = Number(rating);
		if (!numRating || numRating < 1 || numRating > 5) {
			return res
				.status(400)
				.json({ message: 'Rating must be between 1 and 5' });
		}

		if (!comment || !comment.trim()) {
			return res
				.status(400)
				.json({ message: 'Review comment is required' });
		}

		if (!ObjectId.isValid(id)) {
			return res.status(400).json({ message: 'Invalid studio id' });
		}

		const studios = await studiosCol();
		const studio = await studios.findOne({ _id: new ObjectId(id) });
		if (!studio) {
			return res.status(404).json({ message: 'Studio not found' });
		}

		const newReview = {
			userEmail: req.user.email,
			userName: req.user.name || 'Verified Creator',
			rating: numRating,
			comment: comment.trim(),
			createdAt: new Date(),
		};

		const existingReviews = Array.isArray(studio.reviews)
			? studio.reviews
			: [];
		const updatedReviews = [...existingReviews, newReview];

		const totalRating = updatedReviews.reduce(
			(sum, r) => sum + Number(r.rating || 0),
			0,
		);
		const avgRating = Number(
			(totalRating / updatedReviews.length).toFixed(1),
		);

		await studios.updateOne(
			{ _id: new ObjectId(id) },
			{
				$set: {
					reviews: updatedReviews,
					rating: avgRating,
					reviewsCount: updatedReviews.length,
				},
			},
		);

		if (bookingId && ObjectId.isValid(bookingId)) {
			const bookings = await bookingsCol();
			await bookings.updateOne(
				{ _id: new ObjectId(bookingId) },
				{ $set: { hasReviewed: true } },
			);
		}

		res.status(201).json({
			message: 'Review submitted successfully',
			rating: avgRating,
			reviewsCount: updatedReviews.length,
		});
	} catch (err) {
		res.status(500).json({ message: 'Failed to submit review' });
	}
});

connectDB().then(() => {
	app.listen(PORT, () => {
		console.log(`Server running on port ${PORT}`);
	});
});

export default app;
