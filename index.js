import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { exec } from 'child_process'; // Used to execute shell commands
import { writeLog } from './helpers.js';

// Create an interface for user input and output
const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

// Define a sequence of commands with descriptions and actions
const commands = [
	{
		description: 'Step 1: Check and set the correct hub',
		action: (skipPrompt) => {
			console.log('Running: dc-cli hub ls');
			exec('dc-cli hub ls', (err, stdout, stderr) => {
				if (err) {
					console.error(`Error: ${err.message}`);
					return;
				}

				// Display the current hub(s)
				console.log(stdout);
				console.error(stderr);

				// Ask the user if the current hub is correct
				rl.question('\nIs this the correct hub? (yes/no): ', (answer) => {
					if (answer.toLowerCase() === 'yes') {
						console.log('Hub confirmed.');
						promptNextCommand(skipPrompt); // Move to the next step
					} else if (answer.toLowerCase() === 'no') {
						// Prompt for the correct hub name
						rl.question('\nEnter the name of the correct hub: ', (hubName) => {
							console.log(`\nRunning: dc-cli hub use ${hubName}`);
							exec(`dc-cli hub use ${hubName}`, (err, stdout, stderr) => {
								if (err) {
									console.error(`Error: ${err.message}`);
									return;
								}
								console.log(stdout);
								console.error(stderr);
								console.log(`Active hub is now: ${hubName}`);
								promptNextCommand(skipPrompt); // Move to the next step
							});
						});
					} else {
						console.log("Invalid input. Please type 'yes' or 'no'.");
						commands[0].action(skipPrompt); // Restart Step 1 if invalid input
					}
				});
			});
		},
	},
];

// Define the template functions for import/export commands
const commandTemplates = {
	settings: (actionType) => `dc-cli settings ${actionType} ./settings -f`,
	settings_import: (actionType, path) => {
		console.log('actionType, path', actionType, path);
		return `dc-cli settings ${actionType} ${path} -f`;
	},
	extensions: (actionType) => `dc-cli extension ${actionType} ./extensions`,
	schemas: (actionType) => `dc-cli content-type-schema ${actionType} ./schemas`,
	contentTypes: (actionType) =>
		`dc-cli content-type ${actionType} ./content-types`,
	contentItems: (actionType) =>
		`dc-cli content-item ${actionType} ./content-items`,
};

// Function to prompt for the user's choice (import or export)
const promptForActionType = () => {
	rl.question(
		"\nWould you like to 'import' or 'export' data? Type 'import' or 'export': ",
		(actionType) => {
			if (
				actionType.toLowerCase() === 'export' ||
				actionType.toLowerCase() === 'import'
			) {
				// Add Steps 2, 3, 4, 5, and 6 to the sequence
				addCommandsForAction(actionType);

				console.log(`You selected: ${actionType}`);
				promptNextCommand(); // Start the sequence
			} else {
				console.log("Invalid input. Please type 'import' or 'export'.");
				promptForActionType(); // Re-prompt the user
			}
		}
	);
};

function execCallback(err, stdout, stderr) {
	if (err) {
		writeLog(`err: ${err}\nstderr: ${stderr}`);
		console.error(`Error: ${err.message}`);
		return;
	}
	writeLog(`stdout: ${stdout}`);
	console.log(stdout);
	console.error(stderr);
	promptNextCommand();
}

// Retrieve file in settings and concatenate it to ./settings/
function settingsPath(callBack) {
	return new Promise((resolve, reject) => {
		// Define the path to the settings folder
		const settingsDir = './settings';
		let filePath = '';
		// Read the contents of the ./settings folder
		fs.readdir(settingsDir, (err, files) => {
			if (err) {
				reject('Error reading the settings directory:', err);
				return;
			}

			const filename = files[0];
			filePath = path.join(settingsDir, filename);

			resolve(filePath);
		});
	});
}

// Add commands based on import/export selection
const addCommandsForAction = (actionType) => {
	const steps = [
		{
			description: `Step 2: ${actionType} all settings`,
			action: async () => {
				if (actionType === 'import') {
					const filePath = await settingsPath();
					console.log(
						`Running: ${commandTemplates.settings_import(
							actionType,
							`./${filePath}`
						)}`
					);
					exec(
						commandTemplates.settings_import(actionType, `./${filePath}`),
						(err, stdout, stderr) => {
							execCallback(err, stdout, stderr);
						}
					);
				} else {
					console.log(`Running: ${commandTemplates.settings(actionType)}`);
					exec(commandTemplates.settings(actionType), (err, stdout, stderr) => {
						execCallback(err, stdout, stderr);
					});
				}
			},
		},
		{
			description: `Step 3: ${actionType} all extensions`,
			action: () => {
				console.log(`Running: ${commandTemplates.extensions(actionType)}`);
				exec(commandTemplates.extensions(actionType), (err, stdout, stderr) => {
					execCallback(err, stdout, stderr);
				});
			},
		},
		{
			description: `Step 4: ${actionType} all schemas`,
			action: () => {
				console.log(`Running: ${commandTemplates.schemas(actionType)}`);
				exec(commandTemplates.schemas(actionType), (err, stdout, stderr) => {
					execCallback(err, stdout, stderr);
				});
			},
		},
		{
			description: `Step 5: ${actionType} all content-types`,
			action: () => {
				console.log(`Running: ${commandTemplates.contentTypes(actionType)}`);
				exec(
					commandTemplates.contentTypes(actionType),
					(err, stdout, stderr) => {
						execCallback(err, stdout, stderr);
					}
				);
			},
		},
		{
			description: `Step 6: ${actionType} all content-items`,
			action: () => {
				let command =
					actionType === 'import'
						? `${commandTemplates.contentItems(actionType)} -f`
						: commandTemplates.contentItems(actionType);
				console.log(`Running: ${command}`);
				exec(command, (err, stdout, stderr) => {
					execCallback(err, stdout, stderr);
				});
			},
		},
	];

	commands.push(...steps);
};

let currentCommandIndex = 0;

const promptNextCommand = () => {
	if (currentCommandIndex < commands.length) {
		const { description, action } = commands[currentCommandIndex];
		console.log(`\n${description}`);

		rl.question(
			"\nType 'next' to continue, 'skip' to skip this step, or 'exit' to quit: ",
			(answer) => {
				if (answer.toLowerCase() === 'next') {
					currentCommandIndex++;
					action(); // Execute the associated action
				} else if (answer.toLowerCase() === 'skip') {
					console.log('Skipping this step.');
					currentCommandIndex++;
					promptNextCommand();
				} else if (answer.toLowerCase() === 'exit') {
					console.log('Exiting the sequence. Goodbye!');
					rl.close();
				} else {
					console.log("Invalid input. Please type 'next', 'skip', or 'exit'.");
					promptNextCommand();
				}
			}
		);
	} else {
		console.log('\nAll steps completed! 🎉');
		rl.close();
	}
};

// Start the sequence with the prompt for import or export
console.log('Welcome to the command sequence script!');
promptForActionType();
