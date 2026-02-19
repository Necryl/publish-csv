import { z } from 'zod';

export const adminLoginSchema = z.object({
	email: z.string().email('Invalid email'),
	password: z.string().min(1, 'Password required')
});

export const createLinkSchema = z.object({
	name: z.string().min(1, 'Link name required').max(100, 'Link name too long'),
	password: z.string().min(6, 'Password too short'),
	criteria: z.string().default('[]'),
	showSerial: z.boolean().default(false),
	hideFirstColumn: z.boolean().default(false)
});

export const recoveryRequestSchema = z.object({
	message: z.string().max(500, 'Message too long').optional()
});
