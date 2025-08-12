import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	IDataObject,
	IHttpRequestMethods,
	IRequestOptions,
	NodeApiError,
} from 'n8n-workflow';

export async function shapiApiRequest(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	qs: IDataObject = {},
): Promise<any> {
	const credentials = await this.getCredentials('shapiApi');
	const shapiUrl = credentials.shapiUrl as string;

	const options: IRequestOptions = {
		method,
		body,
		qs,
		url: `${shapiUrl}${endpoint}`,
		headers: {
			'Content-Type': 'application/json',
		},
		json: true,
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error as any);
	}
}

export async function getShapiUrl(
	context: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<string> {
	const credentials = await context.getCredentials('shapiApi');
	return credentials.shapiUrl as string;
}