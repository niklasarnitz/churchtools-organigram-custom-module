export type GroupDomainObject = {
	apiUrl: string;
	domainAttributes: {
		note: string;
	};
	domainIdentifier: string;
	domainType: 'group';
	frontendUrl: string;
	imageUrl: string | null | undefined;
	title: string;
	icon?: string | undefined;
};
