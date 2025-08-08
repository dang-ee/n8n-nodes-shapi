import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { shapiApiRequest } from './GenericFunctions';

export class ShapiWaitFileUpdated implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SHAPI Wait File Updated',
		name: 'shapiWaitFileUpdated',
		icon: 'file:shapi2.svg',
		group: ['SHAPI'],
		version: 1,
		description: 'Wait until a specific file is created or updated via SHAPI',
		defaults: {
			name: 'SHAPI Wait File Updated',
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
				description: 'The path to the file to wait for creation or update',
				required: true,
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: 100,
				description: 'Timeout in seconds for waiting for file update',
				required: false,
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
				const timeout = this.getNodeParameter('timeout', i) as number;

				const body = {
					filepath: filePath,
					timeout: timeout,
				};

				const responseData = await shapiApiRequest.call(this, 'POST', shapiUrl, '/wait_file_updated', body);

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