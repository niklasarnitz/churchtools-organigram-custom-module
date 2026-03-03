import { $ } from "bun";

async function deploy() {
    const loginToken = process.env.VITE_CT_LOGIN_TOKEN;
    const ctUrl = process.env.VITE_CT_URL;

    if (!ctUrl || !loginToken) {
        console.error("Missing environment variables. Please check your .env file.");
        process.exit(1);
    }

    const baseUrl = ctUrl.endsWith('/') ? ctUrl.slice(0, -1) : ctUrl;
    const headers = {
        "Authorization": `Login ${loginToken}`,
        "Accept": "application/json",
    };

    console.log(`Connecting to ${baseUrl}...`);

    try {
        const response = await fetch(`${baseUrl}/api/whoami`, { headers });
        if (!response.ok) {
            console.error(`Authentication failed with status: ${response.status}`);
            const text = await response.text();
            console.error(text);
            process.exit(1);
        }
        const result = await response.json() as any;
        const whoami = result.data;
        console.log(`Logged in as: ${whoami.firstName} ${whoami.lastName}`);
    } catch (error) {
        console.error("Authentication failed:", error);
        process.exit(1);
    }

    // 1. Get custom modules to find the one with shorty "organigram"
    let moduleId: number | undefined;
    try {
        const response = await fetch(`${baseUrl}/api/custommodules`, { headers });
        if (!response.ok) throw new Error(`Status ${response.status}`);
        const result = await response.json() as any;
        const modules = result.data;
        
        const organigramModule = Array.isArray(modules) ? modules.find((m: any) => m.shorty === "organigram") : undefined;

        if (!organigramModule) {
            console.log("Could not find custom module with shorty 'organigram'.");
            process.exit(1)
        }

        moduleId = organigramModule.id;
        console.log(`Found module 'organigram' with ID: ${moduleId}`);
    } catch (error) {
        console.error("Failed to fetch custom modules:", error);
        process.exit(1);
    }

    // 2. Build the project
    console.log("Building project...");
    await $`bun run build`;

    // 3. Create zip file
    const packageJson = await Bun.file("package.json").json();
    const version = packageJson.version;
    const zipName = `organigram-${version}.zip`;
    console.log(`Creating zip file ${zipName}...`);
    await $`rm -f ${zipName}`;
    await $`cd build && zip -r ../${zipName} .`;

    // 4. Upload the zip file
    console.log(`Uploading ${zipName} to module ${moduleId}...`);
    const file = Bun.file(zipName);
    const formData = new FormData();
    // In Bun, we can append the file directly
    formData.append("files[]", file, zipName);
    formData.append("customModuleId", String(moduleId));

    try {
        const response = await fetch(`${baseUrl}/api/files/custom_module/${moduleId}`, {
            method: "POST",
            headers: {
                "Authorization": `Login ${loginToken}`,
                "Accept": "application/json",
            },
            body: formData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Upload failed with status ${response.status}: ${errorText}`);
        }

        console.log("Deployment successful!");
    } catch (error) {
        console.error("Upload failed:", error);
        process.exit(1);
    } finally {
        // Clean up
        await $`rm -f ${zipName}`;
    }
}

deploy();
