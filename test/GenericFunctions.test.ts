import { shapiApiRequest } from '../nodes/Shapi/GenericFunctions';
import { IExecuteFunctions } from 'n8n-workflow';
import { createMockExecuteFunctions } from './helpers/mockExecuteFunctions';

describe('GenericFunctions', () => {
	describe('shapiApiRequest', () => {
		let mockExecuteFunctions: IExecuteFunctions;

		beforeEach(() => {
			mockExecuteFunctions = createMockExecuteFunctions();
		});

		afterEach(() => {
			jest.clearAllMocks();
		});

		it('should make a successful POST request', async () => {
			const mockResponse = { stdout: 'Hello World', stderr: '', elapsed_time: 0.1 };
			(mockExecuteFunctions.helpers.request as jest.Mock).mockResolvedValue(mockResponse);

			const result = await shapiApiRequest.call(
				mockExecuteFunctions,
				'POST',
				'http://localhost:3000',
				'/execute',
				{ command: 'echo "Hello World"' }
			);

			expect(result).toEqual(mockResponse);
			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith({
				method: 'POST',
				body: { command: 'echo "Hello World"' },
				qs: {},
				url: 'http://localhost:3000/execute',
				headers: {
					'Content-Type': 'application/json',
				},
				json: true,
			});
		});

		it('should make a successful GET request with query parameters', async () => {
			const mockResponse = { status: 'file_exists' };
			(mockExecuteFunctions.helpers.request as jest.Mock).mockResolvedValue(mockResponse);

			const result = await shapiApiRequest.call(
				mockExecuteFunctions,
				'GET',
				'http://localhost:3000',
				'/status',
				{},
				{ file: '/path/to/file.txt' }
			);

			expect(result).toEqual(mockResponse);
			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith({
				method: 'GET',
				body: {},
				qs: { file: '/path/to/file.txt' },
				url: 'http://localhost:3000/status',
				headers: {
					'Content-Type': 'application/json',
				},
				json: true,
			});
		});

		it('should handle request errors and throw NodeApiError', async () => {
			const mockError = new Error('Network error');
			(mockExecuteFunctions.helpers.request as jest.Mock).mockRejectedValue(mockError);

			await expect(
				shapiApiRequest.call(
					mockExecuteFunctions,
					'POST',
					'http://localhost:3000',
					'/execute',
					{ command: 'echo "test"' }
				)
			).rejects.toThrow('Network error');

			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalled();
		});

		it('should construct URL correctly with different base URLs', async () => {
			const mockResponse = { success: true };
			(mockExecuteFunctions.helpers.request as jest.Mock).mockResolvedValue(mockResponse);

			await shapiApiRequest.call(
				mockExecuteFunctions,
				'POST',
				'https://api.example.com:8080',
				'/execute',
				{ command: 'test' }
			);

			expect(mockExecuteFunctions.helpers.request).toHaveBeenCalledWith({
				method: 'POST',
				body: { command: 'test' },
				qs: {},
				url: 'https://api.example.com:8080/execute',
				headers: {
					'Content-Type': 'application/json',
				},
				json: true,
			});
		});
	});
});