import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { shapiApiRequest } from './GenericFunctions';

export class ShapiExecute implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SHAPI Execute',
		name: 'shapiExecute',
		icon: 'file:shapi.svg',
		group: ['SHAPI'],
		version: 1,
		description: 'Execute shell commands via SHAPI',
		defaults: {
			name: 'SHAPI Execute',
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
				displayName: 'Shell Commands',
				name: 'commands',
				type: 'string',
				typeOptions: {
					rows: 5,
				},
				default: '',
				placeholder: 'echo "Hello World"\nls -la\npwd',
				description: 'Shell commands to execute. Multiple lines will be joined with semicolons.',
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
				const commands = this.getNodeParameter('commands', i) as string;
				
				const commandsArray = commands.split('\n').filter(cmd => cmd.trim() !== '');
				const joinedCommands = commandsArray.join('; ');

				const body = {
					command: joinedCommands,
				};

				const responseData = await shapiApiRequest.call(this, 'POST', shapiUrl, '/execute', body);

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