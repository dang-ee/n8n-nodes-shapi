import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { shapiApiRequest } from './GenericFunctions';

export class ShapiEditFile implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SHAPI Edit File',
		name: 'shapiEditFile',
		icon: 'file:shapi2.svg',
		group: ['SHAPI'],
		version: 1,
		description: 'Open a file for editing with gvim via SHAPI',
		defaults: {
			name: 'SHAPI Edit File',
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
				description: 'Absolute path to the file to edit',
				required: true,
			},
			{
				displayName: 'Editor Options',
				name: 'editorOptions',
				type: 'string',
				default: '',
				placeholder: '-n +10',
				description: 'Additional gvim options (e.g., -n for no swap file, +10 to open at line 10)',
				required: false,
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: 300,
				description: 'Timeout in seconds for the editor session (gvim will block until closed)',
				required: false,
			},
			{
				displayName: 'Create File if Missing',
				name: 'createIfMissing',
				type: 'boolean',
				default: false,
				description: 'Whether to create the file if it does not exist',
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
				const editorOptions = this.getNodeParameter('editorOptions', i) as string;
				const timeout = this.getNodeParameter('timeout', i) as number;
				const createIfMissing = this.getNodeParameter('createIfMissing', i) as boolean;

				// Build the gvim command
				let command = 'gvim';
				
				if (editorOptions.trim()) {
					command += ` ${editorOptions.trim()}`;
				}
				
				// Add the file path (properly escaped)
				command += ` "${filePath}"`;

				// If create file if missing is enabled, ensure directory exists
				if (createIfMissing) {
					const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
					command = `mkdir -p "${dirPath}" && touch "${filePath}" && ${command}`;
				}

				const body = {
					command: command,
					timeout: timeout,
				};

				const responseData = await shapiApiRequest.call(this, 'POST', shapiUrl, '/execute', body);

				// Create a curl command for direct SHAPI execution
				const curlCommand = `curl -X POST "${shapiUrl}/execute" -H "Content-Type: application/json" -d '${JSON.stringify(body)}'`;

				returnData.push({
					json: {
						...responseData,
						filePath: filePath,
						fileUrl: `file://${filePath}`,
						editorCommand: command,
						curlCommand: curlCommand,
						shapiRequest: {
							url: `${shapiUrl}/execute`,
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: body
						},
						editSession: {
							file: filePath,
							editor: 'gvim',
							options: editorOptions || 'none',
							timeout: timeout,
							created: createIfMissing
						}
					},
					pairedItem: {
						item: i,
					},
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
							filePath: this.getNodeParameter('filePath', i) as string,
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