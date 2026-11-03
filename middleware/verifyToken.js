import { createRemoteJWKSet, jwtVerify } from 'jose';

export const verifyToken = async (req, res, next) => {
	const authHeader = req.headers.authorization;
	if (!authHeader) {
		return res.status(401).json({ message: 'Unauthorized!' });
	}

	const token = authHeader.split(' ')[1];
	if (!token) {
		return res.status(401).json({ message: 'Unauthorized!' });
	}

	const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000';
	const JWKS = createRemoteJWKSet(new URL(`${clientUrl}/api/auth/jwks`));

	try {
		const { payload } = await jwtVerify(token, JWKS);
		req.user = payload;
		next();
	} catch {
		return res.status(401).json({ message: 'Unauthorized or Invalid Token!' });
	}
};