export const downloadTextFile = (text: string, filename: string, document: Document) => {
	const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
	const url = URL.createObjectURL(blob);
	const element = document.createElement('a');
	element.setAttribute('href', url);
	element.setAttribute('download', filename);

	element.style.display = 'none';
	document.body.append(element);

	element.click();

	element.remove();
	URL.revokeObjectURL(url);
};
