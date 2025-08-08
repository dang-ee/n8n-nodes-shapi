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
	
	const options: IRequestOptions = {
		method,
		body,
		qs,
		url: `${credentials.baseUrl}${endpoint}`,
		headers: {
			'Authorization': `Bearer ${credentials.apiKey}`,
			'Content-Type': 'application/json',
		},
		json: true,
	};

	try {
		return await this.helpers.request(options);
	} catch (error) {
		throw new NodeApiError(this.getNode(), error);
	}
}