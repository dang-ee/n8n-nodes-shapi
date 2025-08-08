import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { shapiApiRequest } from './GenericFunctions';

export class Shapi implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SHAPI',
		name: 'shapi',
		icon: 'file:shapi.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Interact with SHAPI API',
		defaults: {
			name: 'SHAPI',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'shapiApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Data',
						value: 'data',
					},
				],
				default: 'data',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['data'],
					},
				},
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Get data from SHAPI',
						action: 'Get data',
					},
					{
						name: 'Create',
						value: 'create',
						description: 'Create data in SHAPI',
						action: 'Create data',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Endpoint',
				name: 'endpoint',
				type: 'string',
				default: '',
				placeholder: '/api/endpoint',
				description: 'The API endpoint to call',
				required: true,
			},
			{
				displayName: 'Additional Fields',
				name: 'additionalFields',
				type: 'collection',
				placeholder: 'Add Field',
				default: {},
				options: [
					{
						displayName: 'Query Parameters',
						name: 'queryParameters',
						type: 'fixedCollection',
						default: {},
						typeOptions: {
							multipleValues: true,
						},
						options: [
							{
								name: 'parameter',
								displayName: 'Parameter',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
									},
								],
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;
				const endpoint = this.getNodeParameter('endpoint', i) as string;
				const additionalFields = this.getNodeParameter('additionalFields', i) as any;

				let responseData;

				if (resource === 'data') {
					if (operation === 'get') {
						const qs: any = {};
						
						if (additionalFields.queryParameters) {
							for (const param of additionalFields.queryParameters.parameter) {
								qs[param.name] = param.value;
							}
						}

						responseData = await shapiApiRequest.call(this, 'GET', endpoint, {}, qs);
					} else if (operation === 'create') {
						const body = items[i].json;
						responseData = await shapiApiRequest.call(this, 'POST', endpoint, body);
					}
				}

				returnData.push({
					json: responseData,
					pairedItem: {
						item: i,
					},
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: {
							item: i,
						},
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}