export interface GroupDomainObject {
	apiUrl: string;
	domainAttributes: {
		note: string;
	};
	domainIdentifier: string;
	domainType: 'group';
	frontendUrl: string;
	icon?: string | undefined;
	imageUrl: null | string | undefined;
	title: string;
}
