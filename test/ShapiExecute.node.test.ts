import { ShapiExecute } from '../nodes/Shapi/ShapiExecute.node';
import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { createMockExecuteFunctions, createMockInputData } from './helpers/mockExecuteFunctions';
import * as GenericFunctions from '../nodes/Shapi/GenericFunctions';

jest.mock('../nodes/Shapi/GenericFunctions');

describe('ShapiExecute', () => {
	let shapiExecute: ShapiExecute;
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		shapiExecute = new ShapiExecute();
		mockExecuteFunctions = createMockExecuteFunctions();
		jest.clearAllMocks();
	});

	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			expect(shapiExecute.description.displayName).toBe('SHAPI Execute');
			expect(shapiExecute.description.name).toBe('shapiExecute');
			expect(shapiExecute.description.group).toEqual(['SHAPI']);
			expect(shapiExecute.description.description).toBe('Execute shell commands via SHAPI');
		});

		it('should have correct input/output configuration', () => {
			expect(shapiExecute.description.inputs).toEqual(['main']);
			expect(shapiExecute.description.outputs).toEqual(['main']);
		});

		it('should have required properties for SHAPI URL and commands', () => {
			const properties = shapiExecute.description.properties;
			
			const shapiUrlProperty = properties.find(p => p.name === 'shapiUrl');
			expect(shapiUrlProperty).toBeDefined();
			expect(shapiUrlProperty?.required).toBe(true);
			expect(shapiUrlProperty?.type).toBe('string');

			const commandsProperty = properties.find(p => p.name === 'commands');
			expect(commandsProperty).toBeDefined();
			expect(commandsProperty?.required).toBe(true);
			expect(commandsProperty?.type).toBe('string');
			expect(commandsProperty?.typeOptions?.rows).toBe(5);
		});
	});

	describe('execute', () => {
		it('should execute single command successfully', async () => {
			const mockResponse = {
				stdout: 'Hello World\n',
				stderr: '',
				elapsed_time: 0.1,
				is_timeout: false
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				commands: 'echo "Hello World"'
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await shapiExecute.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
				'POST',
				'http://localhost:3000',
				'/execute',
				{ command: 'echo "Hello World"' }
			);

			expect(result).toEqual([
				[
					{
						json: mockResponse,
						pairedItem: { item: 0 },
					},
				],
			]);
		});

		it('should join multiple commands with semicolons', async () => {
			const mockResponse = {
				stdout: 'command output',
				stderr: '',
				elapsed_time: 0.2,
				is_timeout: false
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				commands: 'echo "Hello"\necho "World"\npwd'
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			await shapiExecute.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
				'POST',
				'http://localhost:3000',
				'/execute',
				{ command: 'echo "Hello"; echo "World"; pwd' }
			);
		});

		it('should filter out empty lines from commands', async () => {
			const mockResponse = {
				stdout: 'filtered output',
				stderr: '',
				elapsed_time: 0.1,
				is_timeout: false
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				commands: 'echo "Hello"\n\n\necho "World"\n   \nls'
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			await shapiExecute.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
				'POST',
				'http://localhost:3000',
				'/execute',
				{ command: 'echo "Hello"; echo "World"; ls' }
			);
		});

		it('should handle multiple input items', async () => {
			const mockResponse = {
				stdout: 'success',
				stderr: '',
				elapsed_time: 0.1,
				is_timeout: false
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				commands: 'echo "test"'
			};

			const inputData = createMockInputData([{ id: 1 }, { id: 2 }]);
			mockExecuteFunctions = createMockExecuteFunctions(mockParameters, inputData);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await shapiExecute.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledTimes(2);
			expect(result[0]).toHaveLength(2);
			expect((result[0][0].pairedItem as any).item).toBe(0);
			expect((result[0][1].pairedItem as any).item).toBe(1);
		});

		it('should handle API errors gracefully when continueOnFail is true', async () => {
			const mockError = new Error('SHAPI server error');

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				commands: 'invalid_command'
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockRejectedValue(mockError);

			const result = await shapiExecute.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0]?.json).toEqual({ error: 'SHAPI server error' });
			expect((result[0][0]?.pairedItem as any)?.item).toBe(0);
		});

		it('should throw error when continueOnFail is false', async () => {
			const mockError = new Error('SHAPI server error');

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				commands: 'invalid_command'
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockRejectedValue(mockError);

			await expect(shapiExecute.execute.call(mockExecuteFunctions)).rejects.toThrow('SHAPI server error');
		});

		it('should handle different SHAPI URL formats', async () => {
			const mockResponse = { stdout: 'test', stderr: '', elapsed_time: 0.1, is_timeout: false };

			const testUrls = [
				'http://localhost:3000',
				'https://api.example.com',
				'http://192.168.1.100:8080',
				'https://shapi.mydomain.com:443'
			];

			for (const url of testUrls) {
				const mockParameters = {
					shapiUrl: url,
					commands: 'echo "test"'
				};

				mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
				(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

				await shapiExecute.execute.call(mockExecuteFunctions);

				expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
					'POST',
					url,
					'/execute',
					{ command: 'echo "test"' }
				);
			}
		});
	});
});