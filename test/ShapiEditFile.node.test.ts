import { ShapiEditFile } from '../nodes/Shapi/ShapiEditFile.node';
import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { createMockExecuteFunctions, createMockInputData } from './helpers/mockExecuteFunctions';
import * as GenericFunctions from '../nodes/Shapi/GenericFunctions';

jest.mock('../nodes/Shapi/GenericFunctions');

describe('ShapiEditFile', () => {
	let shapiEditFile: ShapiEditFile;
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		shapiEditFile = new ShapiEditFile();
		mockExecuteFunctions = createMockExecuteFunctions();
		jest.clearAllMocks();
	});

	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			expect(shapiEditFile.description.displayName).toBe('SHAPI Edit File');
			expect(shapiEditFile.description.name).toBe('shapiEditFile');
			expect(shapiEditFile.description.group).toEqual(['SHAPI']);
			expect(shapiEditFile.description.description).toBe('Select and edit files via SHAPI with gvim');
		});

		it('should have correct input/output configuration', () => {
			expect(shapiEditFile.description.inputs).toEqual(['main']);
			expect(shapiEditFile.description.outputs).toEqual(['main']);
		});

		it('should have required properties for SHAPI URL and file path', () => {
			const properties = shapiEditFile.description.properties;
			
			const shapiUrlProperty = properties.find(p => p.name === 'shapiUrl');
			expect(shapiUrlProperty).toBeDefined();
			expect(shapiUrlProperty?.required).toBe(true);
			expect(shapiUrlProperty?.type).toBe('string');

			const filePathProperty = properties.find(p => p.name === 'filePath');
			expect(filePathProperty).toBeDefined();
			expect(filePathProperty?.required).toBe(true);
			expect(filePathProperty?.type).toBe('resourceLocator');
		});

		it('should have optional display environment property', () => {
			const properties = shapiEditFile.description.properties;
			
			const displayEnvProperty = properties.find(p => p.name === 'displayEnv');
			expect(displayEnvProperty).toBeDefined();
			expect(displayEnvProperty?.required).toBe(false);
			expect(displayEnvProperty?.type).toBe('string');
			expect(displayEnvProperty?.default).toBe('');
		});
	});

	describe('execute', () => {
		it('should return file info without display env when not specified', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: { mode: 'list', value: '/tmp/test.txt' },
				displayEnv: ''
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);

			const result = await shapiEditFile.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json).toEqual({
				filePath: '/tmp/test.txt',
				editor: 'gvim',
				openUrl: 'http://localhost:3000/open_file?tool=gvim&file=%2Ftmp%2Ftest.txt'
			});
			// displayEnv should not be included in response when empty
			expect(result[0][0]?.json.displayEnv).toBeUndefined();
		});

		it('should include display environment when specified', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: { mode: 'list', value: '/tmp/test.txt' },
				displayEnv: ':0'
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);

			const result = await shapiEditFile.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json).toMatchObject({
				filePath: '/tmp/test.txt',
				editor: 'gvim',
				displayEnv: ':0',
				openUrl: 'http://localhost:3000/open_file?tool=gvim&file=%2Ftmp%2Ftest.txt&env=DISPLAY=%3A0'
			});
		});

		it('should include display environment in response', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: { mode: 'list', value: '/home/user/document.txt' },
				displayEnv: ':1'
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);

			const result = await shapiEditFile.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json).toMatchObject({
				filePath: '/home/user/document.txt',
				editor: 'gvim',
				displayEnv: ':1',
				openUrl: 'http://localhost:3000/open_file?tool=gvim&file=%2Fhome%2Fuser%2Fdocument.txt&env=DISPLAY=%3A1'
			});
		});

		it('should handle file paths with spaces correctly', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: { mode: 'list', value: '/home/user/My Documents/file with spaces.txt' },
				displayEnv: ''
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);

			const result = await shapiEditFile.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json).toEqual({
				filePath: '/home/user/My Documents/file with spaces.txt',
				editor: 'gvim',
				openUrl: 'http://localhost:3000/open_file?tool=gvim&file=%2Fhome%2Fuser%2FMy%20Documents%2Ffile%20with%20spaces.txt'
			});
		});

		it('should handle whitespace-only display env as empty', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: { mode: 'list', value: '/tmp/test.txt' },
				displayEnv: '   '
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);

			const result = await shapiEditFile.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json).toEqual({
				filePath: '/tmp/test.txt',
				editor: 'gvim',
				openUrl: 'http://localhost:3000/open_file?tool=gvim&file=%2Ftmp%2Ftest.txt'
			});
			expect(result[0][0]?.json.displayEnv).toBeUndefined();
		});

		it('should handle multiple input items', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: { mode: 'list', value: '/tmp/test.txt' },
				displayEnv: ''
			};

			const inputData = createMockInputData([{ id: 1 }, { id: 2 }]);
			mockExecuteFunctions = createMockExecuteFunctions(mockParameters, inputData);

			const result = await shapiEditFile.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(2);
			expect((result[0][0].pairedItem as any).item).toBe(0);
			expect((result[0][1].pairedItem as any).item).toBe(1);
		});

		it('should handle missing file path gracefully when continueOnFail is true', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: { mode: 'list', value: '' },
				displayEnv: ''
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);

			const result = await shapiEditFile.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0]?.json).toEqual({ 
				error: 'No file path specified'
			});
			expect((result[0][0]?.pairedItem as any)?.item).toBe(0);
		});

		it('should throw error when file path missing and continueOnFail is false', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: { mode: 'list', value: '' },
				displayEnv: ''
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);

			await expect(shapiEditFile.execute.call(mockExecuteFunctions)).rejects.toThrow('No file path specified');
		});

		it('should return proper open URL format with display env', async () => {
			const testCases = [
				{ filePath: '/home/user/file.txt', displayEnv: ':0' },
				{ filePath: '/tmp/test.log', displayEnv: ':1' },
				{ filePath: '/var/log/application.log', displayEnv: ':10.0' },
				{ filePath: '/etc/config/app.conf', displayEnv: 'localhost:10.0' }
			];

			for (const testCase of testCases) {
				const mockParameters = {
					shapiUrl: 'http://localhost:3000',
					filePath: { mode: 'list', value: testCase.filePath },
					displayEnv: testCase.displayEnv
				};

				mockExecuteFunctions = createMockExecuteFunctions(mockParameters);

				const result = await shapiEditFile.execute.call(mockExecuteFunctions);

				expect(result[0][0]?.json.filePath).toBe(testCase.filePath);
				expect(result[0][0]?.json.displayEnv).toBe(testCase.displayEnv);
				expect(result[0][0]?.json.openUrl).toBe(`http://localhost:3000/open_file?tool=gvim&file=${encodeURIComponent(testCase.filePath)}&env=DISPLAY=${encodeURIComponent(testCase.displayEnv)}`);
			}
		});

		it('should return proper open URL format without display env', async () => {
			const testCases = [
				'/home/user/file.txt',
				'/tmp/test.log',
				'/var/log/application.log',
				'/etc/config/app.conf'
			];

			for (const filePath of testCases) {
				const mockParameters = {
					shapiUrl: 'http://localhost:3000',
					filePath: { mode: 'list', value: filePath },
					displayEnv: ''
				};

				mockExecuteFunctions = createMockExecuteFunctions(mockParameters);

				const result = await shapiEditFile.execute.call(mockExecuteFunctions);

				expect(result[0][0]?.json.filePath).toBe(filePath);
				expect(result[0][0]?.json.displayEnv).toBeUndefined();
				expect(result[0][0]?.json.openUrl).toBe(`http://localhost:3000/open_file?tool=gvim&file=${encodeURIComponent(filePath)}`);
			}
		});

		it('should handle path mode resource locator', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: { mode: 'path', value: '/manual/path/file.txt' },
				displayEnv: ''
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);

			const result = await shapiEditFile.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json).toEqual({
				filePath: '/manual/path/file.txt',
				editor: 'gvim',
				openUrl: 'http://localhost:3000/open_file?tool=gvim&file=%2Fmanual%2Fpath%2Ffile.txt'
			});
		});
	});
});