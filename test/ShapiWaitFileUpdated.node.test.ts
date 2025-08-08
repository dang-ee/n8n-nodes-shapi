import { ShapiWaitFileUpdated } from '../nodes/Shapi/ShapiWaitFileUpdated.node';
import { IExecuteFunctions } from 'n8n-workflow';
import { createMockExecuteFunctions, createMockInputData } from './helpers/mockExecuteFunctions';
import * as GenericFunctions from '../nodes/Shapi/GenericFunctions';

jest.mock('../nodes/Shapi/GenericFunctions');

describe('ShapiWaitFileUpdated', () => {
	let shapiWaitFileUpdated: ShapiWaitFileUpdated;
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		shapiWaitFileUpdated = new ShapiWaitFileUpdated();
		mockExecuteFunctions = createMockExecuteFunctions();
		jest.clearAllMocks();
	});

	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			expect(shapiWaitFileUpdated.description.displayName).toBe('SHAPI Wait File Updated');
			expect(shapiWaitFileUpdated.description.name).toBe('shapiWaitFileUpdated');
			expect(shapiWaitFileUpdated.description.group).toEqual(['SHAPI']);
			expect(shapiWaitFileUpdated.description.description).toBe('Wait until a specific file is created or updated via SHAPI');
		});

		it('should have correct input/output configuration', () => {
			expect(shapiWaitFileUpdated.description.inputs).toEqual(['main']);
			expect(shapiWaitFileUpdated.description.outputs).toEqual(['main']);
		});

		it('should have required properties for SHAPI URL and file path', () => {
			const properties = shapiWaitFileUpdated.description.properties;
			
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
				file_path: '/tmp/new_file.txt',
				timestamp: '2024-01-01T12:00:00Z',
				elapsed_time: 1.2,
				action: 'created'
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/new_file.txt'
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await shapiWaitFileUpdated.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
				'POST',
				'http://localhost:3000',
				'/wait_file_updated',
				{ file_path: '/tmp/new_file.txt' }
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

		it('should wait for file update successfully', async () => {
			const mockResponse = {
				status: 'file_updated',
				file_path: '/tmp/existing_file.txt',
				timestamp: '2024-01-01T12:05:00Z',
				elapsed_time: 5.7,
				action: 'updated',
				previous_timestamp: '2024-01-01T11:30:00Z'
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/existing_file.txt'
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			await shapiWaitFileUpdated.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
				'POST',
				'http://localhost:3000',
				'/wait_file_updated',
				{ file_path: '/tmp/existing_file.txt' }
			);
		});

		it('should handle different file path formats', async () => {
			const testCases = [
				{
					path: '/home/user/documents/report.pdf',
					description: 'absolute path with directories'
				},
				{
					path: './output/data.json',
					description: 'relative path'
				},
				{
					path: '~/Downloads/file.zip',
					description: 'home directory path'
				},
				{
					path: '/tmp/file with spaces & symbols-123.txt',
					description: 'path with special characters'
				}
			];

			for (const testCase of testCases) {
				const mockResponse = {
					status: 'file_updated',
					file_path: testCase.path,
					timestamp: '2024-01-01T12:00:00Z',
					action: 'created'
				};

				const mockParameters = {
					shapiUrl: 'http://localhost:3000',
					filePath: testCase.path
				};

				mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
				(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

				await shapiWaitFileUpdated.execute.call(mockExecuteFunctions);

				expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
					'POST',
					'http://localhost:3000',
					'/wait_file_updated',
					{ file_path: testCase.path }
				);
			}
		});

		it('should handle multiple input items', async () => {
			const mockResponse = {
				status: 'file_updated',
				file_path: '/tmp/test.txt',
				timestamp: '2024-01-01T12:00:00Z',
				action: 'updated'
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/test.txt'
			};

			const inputData = createMockInputData([
				{ workflow_id: 1, file_type: 'log' },
				{ workflow_id: 2, file_type: 'data' },
				{ workflow_id: 3, file_type: 'config' }
			]);
			mockExecuteFunctions = createMockExecuteFunctions(mockParameters, inputData);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await shapiWaitFileUpdated.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledTimes(3);
			expect(result[0]).toHaveLength(3);
			expect((result[0][0].pairedItem as any).item).toBe(0);
			expect((result[0][1].pairedItem as any).item).toBe(1);
			expect((result[0][2].pairedItem as any).item).toBe(2);
		});

		it('should handle timeout scenarios', async () => {
			const mockResponse = {
				status: 'timeout',
				file_path: '/tmp/never_updated.txt',
				elapsed_time: 60.0,
				message: 'File was not created or updated within timeout period'
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/never_updated.txt'
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await shapiWaitFileUpdated.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json).toEqual(mockResponse);
		});

		it('should handle file permission errors', async () => {
			const mockResponse = {
				status: 'error',
				file_path: '/root/protected_file.txt',
				error: 'Permission denied',
				message: 'Cannot monitor file due to insufficient permissions'
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/root/protected_file.txt'
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await shapiWaitFileUpdated.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json).toEqual(mockResponse);
		});

		it('should handle API errors gracefully when continueOnFail is true', async () => {
			const mockError = new Error('Connection timeout');

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/test.txt'
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockRejectedValue(mockError);

			const result = await shapiWaitFileUpdated.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0]?.json).toEqual({ error: 'Connection timeout' });
			expect((result[0][0]?.pairedItem as any)?.item).toBe(0);
		});

		it('should throw error when continueOnFail is false', async () => {
			const mockError = new Error('Network unreachable');

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/test.txt'
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockRejectedValue(mockError);

			await expect(shapiWaitFileUpdated.execute.call(mockExecuteFunctions)).rejects.toThrow('Network unreachable');
		});

		it('should handle different SHAPI URL formats', async () => {
			const mockResponse = { 
				status: 'file_updated', 
				file_path: '/test.txt',
				timestamp: '2024-01-01T12:00:00Z',
				action: 'updated'
			};

			const testUrls = [
				'http://localhost:3000',
				'https://api.example.com',
				'http://192.168.1.100:8080',
				'https://shapi.mydomain.com:443',
				'http://shapi.local:9000'
			];

			for (const url of testUrls) {
				const mockParameters = {
					shapiUrl: url,
					filePath: '/test.txt'
				};

				mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
				(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

				await shapiWaitFileUpdated.execute.call(mockExecuteFunctions);

				expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
					'POST',
					url,
					'/wait_file_updated',
					{ file_path: '/test.txt' }
				);
			}
		});

		it('should handle empty file path edge case', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: ''
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			const mockError = new Error('File path cannot be empty');
			(GenericFunctions.shapiApiRequest as jest.Mock).mockRejectedValue(mockError);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

			const result = await shapiWaitFileUpdated.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json).toEqual({ error: 'File path cannot be empty' });
		});

		it('should preserve original response data structure', async () => {
			const mockResponse = {
				status: 'file_updated',
				file_path: '/tmp/data.json',
				timestamp: '2024-01-01T12:00:00Z',
				elapsed_time: 3.14,
				action: 'updated',
				file_size: 1024,
				last_modified: '2024-01-01T11:57:00Z',
				metadata: {
					permissions: '644',
					owner: 'user',
					group: 'users'
				}
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/data.json'
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await shapiWaitFileUpdated.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json).toEqual(mockResponse);
			expect(result[0][0].json.metadata).toBeDefined();
			expect(result[0][0].json.file_size).toBe(1024);
		});
	});
});