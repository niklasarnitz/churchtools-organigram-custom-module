/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable perfectionist/sort-modules */
/* eslint-disable perfectionist/sort-object-types */
/* eslint-disable perfectionist/sort-objects */

import { spawn } from 'node:child_process';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

type DeployContext = {
	baseUrl: string;
	headers: {
		Authorization: string;
		Accept: string;
	};
	loginToken: string;
};

type WhoAmIResponse = {
	data?: {
		firstName?: string;
		lastName?: string;
	};
};

type CustomModule = {
	id?: number;
	shorty?: string;
};

type CustomModulesResponse = {
	data?: CustomModule[];
};

function sanitizeFileNamePart(value: string) {
	return value.replace(/[^a-zA-Z0-9._-]/g, '-');
}

function getErrorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

async function createInstallKit(zipName: string, version: string, reason: string) {
	const releaseDir = `releases/${sanitizeFileNamePart(version)}`;
	const releaseZipPath = `${releaseDir}/${zipName}`;
	const readmePath = `${releaseDir}/README.txt`;

	console.warn(`Creating install kit in ${releaseDir}...`);
	await mkdir(releaseDir, { recursive: true });
	await copyFile(zipName, releaseZipPath);

	const readmeContent = [
		'ChurchTools Organigram Install Kit',
		`Version: ${version}`,
		`Created: ${new Date().toISOString()}`,
		'',
		'Direct deploy was not possible.',
		`Reason: ${reason}`,
		'',
		'Installation steps:',
		'1. Open ChurchTools and navigate to custom modules.',
		'2. Edit or create the custom module with shorty "organigram".',
		`3. Upload the file "${zipName}" from this folder.`,
	].join('\n');

	await writeFile(readmePath, `${readmeContent}\n`, 'utf8');
	console.log(`Install kit created: ${releaseZipPath}`);
	console.log(`Instructions written to: ${readmePath}`);
}

async function runCommand(command: string, args: string[], options?: { cwd?: string }) {
	await new Promise<void>((resolve, reject) => {
		const child = spawn(command, args, {
			cwd: options?.cwd,
			stdio: 'inherit',
		});

		child.on('error', reject);
		child.on('exit', (code) => {
			if (code === 0) {
				resolve();
				return;
			}

			reject(new Error(`Command failed: ${command} ${args.join(' ')}`));
		});
	});
}

async function authenticate(context: DeployContext) {
	const response = await fetch(`${context.baseUrl}/api/whoami`, { headers: context.headers });
	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Authentication failed with status ${response.status}: ${text}`);
	}

	const result = (await response.json()) as WhoAmIResponse;
	return result.data;
}

async function fetchModuleId(context: DeployContext) {
	const response = await fetch(`${context.baseUrl}/api/custommodules`, { headers: context.headers });
	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Fetching custom modules failed with status ${response.status}: ${text}`);
	}

	const result = (await response.json()) as CustomModulesResponse;
	const modules = result.data;
	const organigramModule = modules?.find((module_) => module_.shorty === 'organigram');

	if (!organigramModule?.id) {
		throw new Error("Could not find custom module with shorty 'organigram'.");
	}

	return organigramModule.id;
}

async function uploadZip(context: DeployContext, moduleId: number, zipName: string) {
	const file = new File([await readFile(zipName)], zipName, { type: 'application/zip' });
	const formData = new FormData();
	formData.append('files[]', file, zipName);
	formData.append('customModuleId', String(moduleId));

	const response = await fetch(`${context.baseUrl}/api/files/custom_module/${moduleId}`, {
		method: 'POST',
		headers: {
			Authorization: `Login ${context.loginToken}`,
			Accept: 'application/json',
		},
		body: formData,
	});

	if (!response.ok) {
		const errorText = await response.text();
		throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
	}
}

async function deploy() {
	const loginToken = process.env.VITE_CT_LOGIN_TOKEN;
	const ctUrl = process.env.VITE_CT_URL;

	console.log('Building project...');
	await runCommand('bun', ['run', 'build']);

	const packageJson = JSON.parse(await readFile('package.json', 'utf8')) as { version: string };
	const version = packageJson.version;
	const zipName = `organigram-${version}.zip`;
	console.log(`Creating zip file ${zipName}...`);
	await rm(zipName, { force: true });
	await runCommand('zip', ['-r', `../${zipName}`, '.'], { cwd: 'build' });

	let fallbackReason: string | undefined;
	let directDeploySucceeded = false;

	if (!ctUrl || !loginToken) {
		fallbackReason = 'Missing VITE_CT_URL or VITE_CT_LOGIN_TOKEN environment variables.';
	} else {
		const context: DeployContext = {
			baseUrl: ctUrl.endsWith('/') ? ctUrl.slice(0, -1) : ctUrl,
			headers: {
				Authorization: `Login ${loginToken}`,
				Accept: 'application/json',
			},
			loginToken,
		};

		console.log(`Connecting to ${context.baseUrl}...`);

		try {
			const whoami = await authenticate(context);
			const firstName = whoami?.firstName ?? 'Unknown';
			const lastName = whoami?.lastName ?? 'User';
			console.log(`Logged in as: ${firstName} ${lastName}`);

			const moduleId = await fetchModuleId(context);
			console.log(`Found module 'organigram' with ID: ${String(moduleId)}`);

			console.log(`Uploading ${zipName} to module ${String(moduleId)}...`);
			await uploadZip(context, moduleId, zipName);
			directDeploySucceeded = true;
			console.log('Deployment successful!');
		} catch (error) {
			fallbackReason = getErrorMessage(error);
			console.error(`Direct deployment failed: ${fallbackReason}`);
		}
	}

	try {
		if (!directDeploySucceeded) {
			await createInstallKit(zipName, version, fallbackReason ?? 'Unknown deployment error.');
		}
	} finally {
		await rm(zipName, { force: true });
	}
}

void deploy();
