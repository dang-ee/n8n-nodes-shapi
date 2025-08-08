import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { shapiApiRequest } from './GenericFunctions';

export class ShapiWaitFileCreated implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SHAPI Wait File Created',
		name: 'shapiWaitFileCreated',
		icon: 'file:shapi.svg',
		group: ['SHAPI'],
		version: 1,
		description: 'Wait until a specific file is created via SHAPI',
		defaults: {
			name: 'SHAPI Wait File Created',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		properties: [
			{
				displayName: 'SHAPI URL',
				name: 'shapiUrl',
				type: 'string',
				default: '',
				placeholder: 'http://localhost:3000',
				description: 'The SHAPI server URL',
				required: true,
			},
			{
				displayName: 'File Path',
				name: 'filePath',
				type: 'string',
				default: '',
				placeholder: '/path/to/file.txt',
				description: 'The path to the file to wait for creation',
				required: true,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const shapiUrl = this.getNodeParameter('shapiUrl', i) as string;
				const filePath = this.getNodeParameter('filePath', i) as string;

				const body = {
					file_path: filePath,
				};

				const responseData = await shapiApiRequest.call(this, 'POST', shapiUrl, '/wait_file_created', body);

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
							error: (error as Error).message,
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