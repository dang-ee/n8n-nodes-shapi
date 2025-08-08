import { ShapiWaitFileCreated } from '../nodes/Shapi/ShapiWaitFileCreated.node';
import { IExecuteFunctions } from 'n8n-workflow';
import { createMockExecuteFunctions, createMockInputData } from './helpers/mockExecuteFunctions';
import * as GenericFunctions from '../nodes/Shapi/GenericFunctions';

jest.mock('../nodes/Shapi/GenericFunctions');

describe('ShapiWaitFileCreated', () => {
	let shapiWaitFileCreated: ShapiWaitFileCreated;
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		shapiWaitFileCreated = new ShapiWaitFileCreated();
		mockExecuteFunctions = createMockExecuteFunctions();
		jest.clearAllMocks();
	});

	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			expect(shapiWaitFileCreated.description.displayName).toBe('SHAPI Wait File Created');
			expect(shapiWaitFileCreated.description.name).toBe('shapiWaitFileCreated');
			expect(shapiWaitFileCreated.description.group).toEqual(['SHAPI']);
			expect(shapiWaitFileCreated.description.description).toBe('Wait until a specific file is created via SHAPI');
		});

		it('should have correct input/output configuration', () => {
			expect(shapiWaitFileCreated.description.inputs).toEqual(['main']);
			expect(shapiWaitFileCreated.description.outputs).toEqual(['main']);
		});

		it('should have required properties for SHAPI URL and file path', () => {
			const properties = shapiWaitFileCreated.description.properties;
			
			const shapiUrlProperty = properties.find(p => p.name === 'shapiUrl');
			expect(shapiUrlProperty).toBeDefined();
			expect(shapiUrlProperty?.required).toBe(true);
			expect(shapiUrlProperty?.type).toBe('string');

			const filePathProperty = properties.find(p => p.name === 'filePath');
			expect(filePathProperty).toBeDefined();
			expect(filePathProperty?.required).toBe(true);
			expect(filePathProperty?.type).toBe('string');
			expect(filePathProperty?.placeholder).toBe('/path/to/file.txt');
		});
	});

	describe('execute', () => {
		it('should wait for file creation successfully', async () => {
			const mockResponse = {
				status: 'file_created',
				filepath: '/tmp/test.txt',
				timestamp: '2024-01-01T12:00:00Z',
				elapsed_time: 2.5
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/test.txt',
				timeout: 100
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await shapiWaitFileCreated.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
				'POST',
				'http://localhost:3000',
				'/wait_file_created',
				{ filepath: '/tmp/test.txt', timeout: 100 }
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

		it('should handle absolute file paths', async () => {
			const mockResponse = {
				status: 'file_created',
				filepath: '/home/user/documents/report.pdf',
				timestamp: '2024-01-01T12:00:00Z'
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/home/user/documents/report.pdf',
				timeout: 100
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			await shapiWaitFileCreated.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
				'POST',
				'http://localhost:3000',
				'/wait_file_created',
				{ filepath: '/home/user/documents/report.pdf', timeout: 100 }
			);
		});

		it('should handle relative file paths', async () => {
			const mockResponse = {
				status: 'file_created',
				filepath: './output/data.json',
				timestamp: '2024-01-01T12:00:00Z'
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: './output/data.json',
				timeout: 100
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			await shapiWaitFileCreated.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
				'POST',
				'http://localhost:3000',
				'/wait_file_created',
				{ filepath: './output/data.json', timeout: 100 }
			);
		});

		it('should handle multiple input items', async () => {
			const mockResponse = {
				status: 'file_created',
				filepath: '/tmp/test.txt',
				timestamp: '2024-01-01T12:00:00Z'
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/test.txt',
				timeout: 100
			};

			const inputData = createMockInputData([{ id: 1 }, { id: 2 }]);
			mockExecuteFunctions = createMockExecuteFunctions(mockParameters, inputData);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await shapiWaitFileCreated.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledTimes(2);
			expect(result[0]).toHaveLength(2);
			expect((result[0][0].pairedItem as any).item).toBe(0);
			expect((result[0][1].pairedItem as any).item).toBe(1);
		});

		it('should handle timeout scenarios', async () => {
			const mockResponse = {
				status: 'timeout',
				filepath: '/tmp/never_created.txt',
				elapsed_time: 30.0,
				message: 'File was not created within timeout period'
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/never_created.txt',
				timeout: 100
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await shapiWaitFileCreated.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json).toEqual(mockResponse);
		});

		it('should handle API errors gracefully when continueOnFail is true', async () => {
			const mockError = new Error('SHAPI server unreachable');

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/test.txt',
				timeout: 100
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockRejectedValue(mockError);

			const result = await shapiWaitFileCreated.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0]?.json).toEqual({ error: 'SHAPI server unreachable' });
			expect((result[0][0]?.pairedItem as any)?.item).toBe(0);
		});

		it('should throw error when continueOnFail is false', async () => {
			const mockError = new Error('SHAPI server unreachable');

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/test.txt',
				timeout: 100
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockRejectedValue(mockError);

			await expect(shapiWaitFileCreated.execute.call(mockExecuteFunctions)).rejects.toThrow('SHAPI server unreachable');
		});

		it('should handle different SHAPI URL formats', async () => {
			const mockResponse = { 
				status: 'file_created', 
				filepath: '/test.txt',
				timestamp: '2024-01-01T12:00:00Z'
			};

			const testUrls = [
				'http://localhost:3000',
				'https://api.example.com',
				'http://192.168.1.100:8080',
				'https://shapi.mydomain.com:443'
			];

			for (const url of testUrls) {
				const mockParameters = {
					shapiUrl: url,
					filePath: '/test.txt',
					timeout: 100
				};

				mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
				(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

				await shapiWaitFileCreated.execute.call(mockExecuteFunctions);

				expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
					'POST',
					url,
					'/wait_file_created',
					{ filepath: '/test.txt', timeout: 100 }
				);
			}
		});

		it('should handle files with special characters in path', async () => {
			const mockResponse = {
				status: 'file_created',
				filepath: '/tmp/file with spaces & special-chars_123.txt',
				timestamp: '2024-01-01T12:00:00Z'
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/file with spaces & special-chars_123.txt',
				timeout: 100
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			await shapiWaitFileCreated.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
				'POST',
				'http://localhost:3000',
				'/wait_file_created',
				{ filepath: '/tmp/file with spaces & special-chars_123.txt', timeout: 100 }
			);
		});
	});
});