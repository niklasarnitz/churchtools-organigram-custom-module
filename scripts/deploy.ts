import { $ } from "bun";
import { churchtoolsClient } from "@churchtools/churchtools-client";

async function deploy() {
    const username = process.env.VITE_CT_USERNAME;
    const password = process.env.VITE_CT_PASSWORD;
    const ctUrl = process.env.VITE_CTURL;

    if (!username || !password || !ctUrl) {
        console.error("Missing environment variables. Please check your .env file.");
        process.exit(1);
    }

    console.log(`Connecting to ${ctUrl}...`);
    churchtoolsClient.setBaseUrl(ctUrl);

    try {
        await churchtoolsClient.post("/login", {
            username,
            password,
        });
        console.log("Logged in successfully.");
    } catch (error) {
        console.error("Login failed:", error);
        process.exit(1);
    }

    // 1. Get custom modules to find the one with shorty "organigram"
    let moduleId: number | undefined;
    try {
        const response = await churchtoolsClient.get("/custom-modules");
        const modules = response.data as any[];
        const organigramModule = modules.find(m => m.shorty === "organigram");
        
        if (!organigramModule) {
            console.error("Could not find custom module with shorty 'organigram'.");
            process.exit(1);
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
    const version = require("../package.json").version;
    const zipName = `organigram-${version}.zip`;
    console.log(`Creating zip file ${zipName}...`);
    await $`rm -f ${zipName}`;
    await $`cd build && zip -r ../${zipName} .`;

    // 4. Upload the zip file
    console.log(`Uploading ${zipName} to module ${moduleId}...`);
    const file = Bun.file(zipName);
    const formData = new FormData();
    formData.append("files[]", file, zipName);
    formData.append("customModuleId", String(moduleId));

    try {
        // According to user request: POST https://durmersheim.church.tools/api/files/custom_module/52
        // We use the found moduleId
        await churchtoolsClient.post(`/files/custom_module/${moduleId}`, formData);
        console.log("Deployment successful!");
    } catch (error) {
        console.error("Upload failed:", error);
        process.exit(1);
    } finally {
        // Clean up
        await $`rm ${zipName}`;
    }
}

deploy();
