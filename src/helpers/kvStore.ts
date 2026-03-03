import { churchtoolsClient } from "@churchtools/churchtools-client";

import type {
    CustomModule,
    CustomModuleCreate,
    CustomModuleDataCategory,
    CustomModuleDataCategoryCreate,
    CustomModuleDataValue,
    CustomModuleDataValueCreate,
} from "../types/CustomModule";

const EXTENSION_KEY = (import.meta.env.VITE_KEY as string | undefined) ?? 'organigram';

function safeParseJSON(json: null | string | undefined): unknown {
    if (!json) return undefined;
    try {
        return JSON.parse(json);
    } catch {
        return undefined;
    }
}

async function createModule(
    extensionkey: string,
    name: string,
    description: string
): Promise<CustomModule> {
    const createData: CustomModuleCreate = {
        description,
        name,
        shorty: extensionkey,
        sortKey: 100,
    };

    return await churchtoolsClient.post<CustomModule>(
        '/custommodules',
        createData
    );
}

export async function getModule(
    extensionkey: string = EXTENSION_KEY,
): Promise<CustomModule> {
    const allModules: CustomModule[] =
        await churchtoolsClient.get(`/custommodules`);

    const module = allModules.find(
        (item: CustomModule) => item.shorty === extensionkey,
    );

    if (!module) {
        throw new Error(
            `Module for extension key "${extensionkey}" not found.`,
        );
    }

    return module;
}

export async function getOrCreateCustomDataCategory(
    shorty: string,
    name: string,
    moduleId?: number
): Promise<CustomModuleDataCategory> {
    const mId = await resolveModuleId(moduleId);
    const categories: CustomModuleDataCategory[] = await churchtoolsClient.get(
        `/custommodules/${String(mId)}/customdatacategories`,
    );

    const category = categories.find(c => c.shorty === shorty);
    if (category) return category;

    return await churchtoolsClient.post(
        `/custommodules/${String(mId)}/customdatacategories`,
        { data: "{}", name, shorty } as CustomModuleDataCategoryCreate
    );
}

export async function getOrCreateModule(
    extensionkey: string = EXTENSION_KEY,
    name = "Organigramm Settings",
    description = "Settings for the Organigramm module"
): Promise<CustomModule> {
    try {
        return await getModule(extensionkey);
    } catch {
        return await createModule(extensionkey, name, description);
    }
}

export async function getUserSettings<T extends object>(
    categoryShorty: string,
    categoryName: string
): Promise<T | undefined> {
    const category = await getOrCreateCustomDataCategory(categoryShorty, categoryName);
    const mId = category.moduleId;

    const values: CustomModuleDataValue[] = await churchtoolsClient.get(
        `/custommodules/${String(mId)}/customdatacategories/${String(category.id)}/customdatavalues`,
    );

    const userValue = values[0];
    if (!userValue) return undefined;

    return safeParseJSON(userValue.value) as T | undefined;
}

export async function saveUserSettings<T extends object>(
    categoryShorty: string,
    categoryName: string,
    settings: T
): Promise<void> {
    const category = await getOrCreateCustomDataCategory(categoryShorty, categoryName);
    const mId = category.moduleId;

    const values: CustomModuleDataValue[] = await churchtoolsClient.get(
        `/custommodules/${String(mId)}/customdatacategories/${String(category.id)}/customdatavalues`,
    );

    const userValue = values[0];
    const valueStr = JSON.stringify(settings);

    if (userValue) {
        await churchtoolsClient.put(
            `/custommodules/${String(mId)}/customdatacategories/${String(category.id)}/customdatavalues/${String(userValue.id)}`,
            { value: valueStr }
        );
    } else {
        await churchtoolsClient.post(
            `/custommodules/${String(mId)}/customdatacategories/${String(category.id)}/customdatavalues`,
            {
                dataCategoryId: category.id,
                value: valueStr
            } as CustomModuleDataValueCreate
        );
    }
}

async function resolveModuleId(moduleId?: number): Promise<number> {
    if (moduleId) return moduleId;
    const module = await getOrCreateModule();
    return module.id;
}
