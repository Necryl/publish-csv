import { PUBLIC_VAPID_PUBLIC_KEY } from '$env/static/public';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = () => {
	return json({ publicKey: PUBLIC_VAPID_PUBLIC_KEY });
};
