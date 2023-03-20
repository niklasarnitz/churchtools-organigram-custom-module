export const downloadTextFile = (text: string, filename: string, document: Document) => {
	const element = document.createElement('a');
	element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
	element.setAttribute('download', filename);

	element.style.display = 'none';
	document.body.append(element);

	element.click();

	element.remove();
};
