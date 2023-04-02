export const downloadImage = (dataUrl: string) => {
	const a = document.createElement('a');

	a.setAttribute('download', 'reactflow.png');
	a.setAttribute('href', dataUrl);
	a.click();
};
