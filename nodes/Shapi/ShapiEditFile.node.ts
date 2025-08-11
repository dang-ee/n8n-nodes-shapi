import {
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeListSearchItems,
	INodeListSearchResult,
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
		description: 'Select and edit files via SHAPI with gvim',
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
				displayName: 'File Directory',
				name: 'fileDirectory',
				type: 'string',
				default: '.',
				placeholder: '/path/to/directory',
				description: 'Directory to search for files (default: current directory)',
				required: false,
			},
			{
				displayName: 'File Path',
				name: 'filePath',
				type: 'resourceLocator',
				default: { mode: 'list', value: '' },
				required: true,
				description: 'Select the file to edit',
				modes: [
					{
						displayName: 'From List',
						name: 'list',
						type: 'list',
						placeholder: 'Select a file...',
						typeOptions: {
							searchListMethod: 'searchFiles',
							searchable: true,
							searchFilterRequired: false,
						},
					},
					{
						displayName: 'By Path',
						name: 'path',
						type: 'string',
						placeholder: '/absolute/path/to/file.txt',
					},
				],
			},
			{
				displayName: 'Display Environment',
				name: 'displayEnv',
				type: 'string',
				default: '',
				placeholder: ':0',
				description: 'X11 Display environment for gvim (e.g., :0, :1). Leave empty to use system default.',
				required: false,
			},
		],
	};

	methods = {
		listSearch: {
			async searchFiles(
				this: ILoadOptionsFunctions,
				filter?: string,
			): Promise<INodeListSearchResult> {
				const shapiUrl = this.getNodeParameter('shapiUrl') as string;
				const fileDirectory = this.getNodeParameter('fileDirectory', '.') as string;
				
				try {
					// Build ls command to list files in the specified directory
					let lsCommand = `ls -la "${fileDirectory}"`;
					
					// If there's a filter, add it to the ls command
					if (filter && filter.trim()) {
						lsCommand = `ls -la "${fileDirectory}" | grep -i "${filter.trim()}"`;
					}

					const body = {
						command: lsCommand,
						timeout: 30,
					};

					const responseData = await shapiApiRequest.call(this, 'POST', shapiUrl, '/execute', body);
					
					const results: INodeListSearchItems[] = [];
					
					if (responseData.stdout) {
						// Parse ls output to extract files
						const lines = responseData.stdout.split('\n');
						
						for (const line of lines) {
							const trimmedLine = line.trim();
							if (trimmedLine && !trimmedLine.startsWith('total ') && !trimmedLine.startsWith('d')) {
								// Extract filename from ls -la output (last part after spaces)
								const parts = trimmedLine.split(/\s+/);
								if (parts.length >= 9) {
									const filename = parts.slice(8).join(' ');
									const fullPath = fileDirectory === '.' ? filename : `${fileDirectory}/${filename}`;
									
									results.push({
										name: filename,
										value: fullPath,
										url: `${shapiUrl}/open_file?tool=gvim&file=${encodeURIComponent(fullPath)}`,
									});
								}
							}
						}
					}
					
					return {
						results,
					};
				} catch (error) {
					return {
						results: [{
							name: `Error: ${(error as Error).message}`,
							value: '',
						}],
					};
				}
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const shapiUrl = this.getNodeParameter('shapiUrl', i) as string;
				const filePathResource = this.getNodeParameter('filePath', i) as any;
				const displayEnv = this.getNodeParameter('displayEnv', i) as string;

				// Extract file path from resource locator
				let filePath: string;
				if (filePathResource.mode === 'list') {
					filePath = filePathResource.value;
				} else {
					filePath = filePathResource.value;
				}

				if (!filePath) {
					throw new Error('No file path specified');
				}

				// Build URL with optional display environment
				let openUrl = `${shapiUrl}/open_file?tool=gvim&file=${encodeURIComponent(filePath)}`;
				if (displayEnv && displayEnv.trim()) {
					openUrl += `&env=DISPLAY=${encodeURIComponent(displayEnv)}`;
				}

				const responseJson: any = {
					filePath: filePath,
					editor: 'gvim',
					openUrl: openUrl,
				};

				// Only include displayEnv if it was specified
				if (displayEnv && displayEnv.trim()) {
					responseJson.displayEnv = displayEnv;
				}

				returnData.push({
					json: responseJson,
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