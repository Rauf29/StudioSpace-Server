import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);
let db;

export async function connectDB() {
	try {
		if (db) return db;
		await client.connect();
		db = client.db(process.env.DB_NAME || 'studiospace');
		console.log('You successfully connected to MongoDB!');
		return db;
	} catch (err) {
		console.dir(err);
	}
}
