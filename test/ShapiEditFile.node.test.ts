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
			expect(shapiEditFile.description.description).toBe('Open a file for editing with gvim via SHAPI');
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
			expect(filePathProperty?.type).toBe('string');
		});

		it('should have optional editor options and timeout properties', () => {
			const properties = shapiEditFile.description.properties;
			
			const editorOptionsProperty = properties.find(p => p.name === 'editorOptions');
			expect(editorOptionsProperty).toBeDefined();
			expect(editorOptionsProperty?.required).toBe(false);
			expect(editorOptionsProperty?.type).toBe('string');

			const timeoutProperty = properties.find(p => p.name === 'timeout');
			expect(timeoutProperty).toBeDefined();
			expect(timeoutProperty?.required).toBe(false);
			expect(timeoutProperty?.type).toBe('number');
			expect(timeoutProperty?.default).toBe(300);
		});
	});

	describe('execute', () => {
		it('should open file with gvim successfully', async () => {
			const mockResponse = {
				stdout: '',
				stderr: '',
				elapsed_time: 5.2,
				is_timeout: false
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/test.txt',
				editorOptions: '',
				timeout: 300,
				createIfMissing: false
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await shapiEditFile.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
				'POST',
				'http://localhost:3000',
				'/execute',
				{ 
					command: 'gvim "/tmp/test.txt"',
					timeout: 300
				}
			);

			expect(result[0][0]?.json).toMatchObject({
				...mockResponse,
				filePath: '/tmp/test.txt',
				fileUrl: 'file:///tmp/test.txt',
				editorCommand: 'gvim "/tmp/test.txt"',
				editSession: {
					file: '/tmp/test.txt',
					editor: 'gvim',
					options: 'none',
					timeout: 300,
					created: false
				}
			});
		});

		it('should include editor options in command', async () => {
			const mockResponse = {
				stdout: '',
				stderr: '',
				elapsed_time: 3.1,
				is_timeout: false
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/home/user/document.txt',
				editorOptions: '-n +25',
				timeout: 600,
				createIfMissing: false
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			await shapiEditFile.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
				'POST',
				'http://localhost:3000',
				'/execute',
				{ 
					command: 'gvim -n +25 "/home/user/document.txt"',
					timeout: 600
				}
			);
		});

		it('should create file and directory when createIfMissing is true', async () => {
			const mockResponse = {
				stdout: '',
				stderr: '',
				elapsed_time: 2.8,
				is_timeout: false
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/new/dir/newfile.txt',
				editorOptions: '',
				timeout: 300,
				createIfMissing: true
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			await shapiEditFile.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
				'POST',
				'http://localhost:3000',
				'/execute',
				{ 
					command: 'mkdir -p "/tmp/new/dir" && touch "/tmp/new/dir/newfile.txt" && gvim "/tmp/new/dir/newfile.txt"',
					timeout: 300
				}
			);
		});

		it('should handle file paths with spaces correctly', async () => {
			const mockResponse = {
				stdout: '',
				stderr: '',
				elapsed_time: 1.5,
				is_timeout: false
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/home/user/My Documents/file with spaces.txt',
				editorOptions: '-n',
				timeout: 300,
				createIfMissing: false
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			await shapiEditFile.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledWith(
				'POST',
				'http://localhost:3000',
				'/execute',
				{ 
					command: 'gvim -n "/home/user/My Documents/file with spaces.txt"',
					timeout: 300
				}
			);
		});

		it('should handle multiple input items', async () => {
			const mockResponse = {
				stdout: '',
				stderr: '',
				elapsed_time: 4.0,
				is_timeout: false
			};

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/test.txt',
				editorOptions: '',
				timeout: 300,
				createIfMissing: false
			};

			const inputData = createMockInputData([{ id: 1 }, { id: 2 }]);
			mockExecuteFunctions = createMockExecuteFunctions(mockParameters, inputData);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

			const result = await shapiEditFile.execute.call(mockExecuteFunctions);

			expect(GenericFunctions.shapiApiRequest).toHaveBeenCalledTimes(2);
			expect(result[0]).toHaveLength(2);
			expect((result[0][0].pairedItem as any).item).toBe(0);
			expect((result[0][1].pairedItem as any).item).toBe(1);
		});

		it('should handle API errors gracefully when continueOnFail is true', async () => {
			const mockError = new Error('SHAPI server error');

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/invalid/path/file.txt',
				editorOptions: '',
				timeout: 300,
				createIfMissing: false
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockRejectedValue(mockError);

			const result = await shapiEditFile.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0]?.json).toEqual({ 
				error: 'SHAPI server error',
				filePath: '/invalid/path/file.txt'
			});
			expect((result[0][0]?.pairedItem as any)?.item).toBe(0);
		});

		it('should throw error when continueOnFail is false', async () => {
			const mockError = new Error('SHAPI server error');

			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/invalid/path/file.txt',
				editorOptions: '',
				timeout: 300,
				createIfMissing: false
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);
			(GenericFunctions.shapiApiRequest as jest.Mock).mockRejectedValue(mockError);

			await expect(shapiEditFile.execute.call(mockExecuteFunctions)).rejects.toThrow('SHAPI server error');
		});

		it('should return proper file URL format', async () => {
			const mockResponse = {
				stdout: '',
				stderr: '',
				elapsed_time: 1.0,
				is_timeout: false
			};

			const testPaths = [
				'/home/user/file.txt',
				'/tmp/test.log',
				'/var/log/application.log',
				'/etc/config/app.conf'
			];

			for (const filePath of testPaths) {
				const mockParameters = {
					shapiUrl: 'http://localhost:3000',
					filePath: filePath,
					editorOptions: '',
					timeout: 300,
					createIfMissing: false
				};

				mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
				(GenericFunctions.shapiApiRequest as jest.Mock).mockResolvedValue(mockResponse);

				const result = await shapiEditFile.execute.call(mockExecuteFunctions);

				expect(result[0][0]?.json.filePath).toBe(filePath);
				expect(result[0][0]?.json.fileUrl).toBe(`file://${filePath}`);
			}
		});
	});
});