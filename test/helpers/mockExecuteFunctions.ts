import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

export function createMockExecuteFunctions(
	parameters: Record<string, any> = {},
	inputData: INodeExecutionData[] = [{ json: {} }]
): IExecuteFunctions {
	return {
		getInputData: jest.fn().mockReturnValue(inputData),
		getNodeParameter: jest.fn().mockImplementation((parameterName: string, itemIndex: number) => {
			return parameters[parameterName];
		}),
		getCredentials: jest.fn().mockResolvedValue({}),
		continueOnFail: jest.fn().mockReturnValue(false),
		helpers: {
			request: jest.fn().mockResolvedValue({ success: true }),
			prepareBinaryData: jest.fn().mockResolvedValue({
				data: Buffer.from('mock binary data'),
				mimeType: 'application/octet-stream',
			}),
		},
		getNode: jest.fn().mockReturnValue({
			name: 'Test Node',
			type: 'test-node',
		}),
	} as unknown as IExecuteFunctions;
}

export function createMockInputData(data: any[]): INodeExecutionData[] {
	return data.map(item => ({ json: item }));
}