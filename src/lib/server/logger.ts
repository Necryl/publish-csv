type LogLevel = 'info' | 'warn' | 'error';

type LogPayload = {
	level: LogLevel;
	message: string;
	context?: Record<string, unknown>;
	timestamp: string;
};

function emit(payload: LogPayload): void {
	const line = JSON.stringify(payload);
	if (payload.level === 'error') {
		console.error(line);
		return;
	}
	if (payload.level === 'warn') {
		console.warn(line);
		return;
	}
	console.info(line);
}

export function logInfo(message: string, context?: Record<string, unknown>): void {
	emit({ level: 'info', message, context, timestamp: new Date().toISOString() });
}

export function logWarn(message: string, context?: Record<string, unknown>): void {
	emit({ level: 'warn', message, context, timestamp: new Date().toISOString() });
}

export function logError(message: string, context?: Record<string, unknown>): void {
	emit({ level: 'error', message, context, timestamp: new Date().toISOString() });
}
