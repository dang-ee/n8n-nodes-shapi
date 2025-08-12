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
		icon: 'file:shapi2.svg',
		group: ['SHAPI'],
		version: 1,
		description: 'Execute shell commands via SHAPI',
		defaults: {
			name: 'SHAPI Execute',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'shapiApi',
				required: true,
			},
		],
		properties: [
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
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: 100,
				description: 'Timeout in seconds for the command execution',
				required: false,
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const commands = this.getNodeParameter('commands', i) as string;
				const timeout = this.getNodeParameter('timeout', i) as number;
				
				const commandsArray = commands.split('\n').filter(cmd => cmd.trim() !== '');
				const joinedCommands = commandsArray.join('; ');

				const body = {
					command: joinedCommands,
					timeout: timeout,
				};

				const responseData = await shapiApiRequest.call(this, 'POST', '/execute', body);

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