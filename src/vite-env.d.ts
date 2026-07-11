/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** @deprecated Use VITE_CT_URL instead. */
	readonly REACT_APP_CTURL?: string;
	/** @deprecated Use VITE_CT_PASSWORD instead. */
	readonly REACT_APP_PASSWORD?: string;
	/** @deprecated Use VITE_CT_USERNAME instead. */
	readonly REACT_APP_USERNAME?: string;
	readonly VITE_CT_URL?: string;
	/** @deprecated Use VITE_CT_URL instead. */
	readonly VITE_CTURL?: string;
	readonly VITE_PRIMARY_PARENT_GROUP_FIELD?: string;
}
