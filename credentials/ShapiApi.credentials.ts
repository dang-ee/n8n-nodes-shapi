import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class ShapiApi implements ICredentialType {
	name = 'shapiApi';
	displayName = 'SHAPI API';
	documentationUrl = 'https://github.com/dang-ee/n8n-nodes-shapi';
	properties: INodeProperties[] = [
		{
			displayName: 'SHAPI URL',
			name: 'shapiUrl',
			type: 'string',
			default: '',
			placeholder: 'http://localhost:3000',
			description: 'The SHAPI server URL',
			required: true,
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.shapiUrl}}',
			url: '/status',
			method: 'GET',
		},
	};
}