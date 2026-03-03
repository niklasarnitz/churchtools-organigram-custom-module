import { useEffect } from "react";

export const useCustomModuleTitleBar = () => {
    useEffect(() => {
        document.title = `${document.title.replaceAll(' Organigram', '')} Organigramm`
    }, [window.location]);
}
