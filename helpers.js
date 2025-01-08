import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logFilePath = path.join(__dirname, 'logs.log');

export const writeLog = (message) => {
	const timestamp = new Date().toISOString();
	const logMessage = `[${timestamp}] ${message}\n`;

	fs.appendFile(logFilePath, logMessage, (err) => {
		if (err) {
			console.error('Error writing to log file:', err);
		} else {
			console.log('Log written successfully.');
		}
	});
};
