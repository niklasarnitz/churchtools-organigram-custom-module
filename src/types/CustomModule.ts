export interface CustomModule {
	description: string;
	id: number;
	name: string;
	shorty: string;
	sortKey: number;
}

export interface CustomModuleCreate {
	description: string;
	name: string;
	shorty: string;
	sortKey: number;
}

export interface CustomModuleDataCategory {
	data: string; // JSON string
	id: number;
	moduleId: number;
	name: string;
	shorty: string;
}

export interface CustomModuleDataCategoryCreate {
	data: string; // JSON string
	name: string;
	shorty: string;
}

export interface CustomModuleDataValue {
	dataCategoryId: number;
	id: number;
	personId: number;
	value: string; // JSON string
}

export interface CustomModuleDataValueCreate {
	dataCategoryId: number;
	personId: number;
	value: string; // JSON string
}
