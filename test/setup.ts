// Test setup file for n8n node testing
import { jest } from '@jest/globals';

// Mock n8n-workflow module
jest.mock('n8n-workflow', () => ({
	NodeApiError: jest.fn().mockImplementation((node, error: any) => {
		const err = new Error((error as Error).message || 'API Error');
		err.name = 'NodeApiError';
		return err;
	}),
	NodeOperationError: jest.fn().mockImplementation((node, error: any) => {
		const err = new Error((error as Error).message || 'Operation Error');
		err.name = 'NodeOperationError';
		return err;
	}),
}));