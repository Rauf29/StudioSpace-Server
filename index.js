import cookieParser from 'cookie-parser';
import cors from 'cors';
import 'dotenv/config';
import express from 'express';

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

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});

export default app;
