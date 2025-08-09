import { ShapiOpenInGvim } from '../nodes/Shapi/ShapiOpenInGvim.node';
import { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';
import { createMockExecuteFunctions, createMockInputData } from './helpers/mockExecuteFunctions';

describe('ShapiOpenInGvim', () => {
	let shapiOpenInGvim: ShapiOpenInGvim;
	let mockExecuteFunctions: IExecuteFunctions;

	beforeEach(() => {
		shapiOpenInGvim = new ShapiOpenInGvim();
		mockExecuteFunctions = createMockExecuteFunctions();
		jest.clearAllMocks();
	});

	describe('Node Description', () => {
		it('should have correct basic properties', () => {
			expect(shapiOpenInGvim.description.displayName).toBe('SHAPI Open in gVim');
			expect(shapiOpenInGvim.description.name).toBe('shapiOpenInGvim');
			expect(shapiOpenInGvim.description.group).toEqual(['SHAPI']);
			expect(shapiOpenInGvim.description.description).toBe('Create a clickable helper page to open a file in gVim via SHAPI server');
		});

		it('should have correct input/output configuration', () => {
			expect(shapiOpenInGvim.description.inputs).toEqual(['main']);
			expect(shapiOpenInGvim.description.outputs).toEqual(['main']);
		});

		it('should have required properties for SHAPI URL and file path', () => {
			const properties = shapiOpenInGvim.description.properties;
			
			const shapiUrlProperty = properties.find(p => p.name === 'shapiUrl');
			expect(shapiUrlProperty).toBeDefined();
			expect(shapiUrlProperty?.required).toBe(true);
			expect(shapiUrlProperty?.type).toBe('string');

			const filePathProperty = properties.find(p => p.name === 'filePath');
			expect(filePathProperty).toBeDefined();
			expect(filePathProperty?.required).toBe(true);
			expect(filePathProperty?.type).toBe('string');
		});

		it('should have optional line and column properties', () => {
			const properties = shapiOpenInGvim.description.properties;
			
			const lineProperty = properties.find(p => p.name === 'line');
			expect(lineProperty).toBeDefined();
			expect(lineProperty?.type).toBe('number');
			expect(lineProperty?.default).toBe(0);

			const columnProperty = properties.find(p => p.name === 'column');
			expect(columnProperty).toBeDefined();
			expect(columnProperty?.type).toBe('number');
			expect(columnProperty?.default).toBe(0);
		});

		it('should have encoding options property', () => {
			const properties = shapiOpenInGvim.description.properties;
			
			const encodingProperty = properties.find(p => p.name === 'encoding');
			expect(encodingProperty).toBeDefined();
			expect(encodingProperty?.type).toBe('options');
			expect(encodingProperty?.default).toBe('');
			expect((encodingProperty as any)?.options).toContainEqual({ name: 'Auto (default)', value: '' });
			expect((encodingProperty as any)?.options).toContainEqual({ name: 'UTF-8', value: 'utf-8' });
		});


		it('should have hints for user guidance', () => {
			expect(shapiOpenInGvim.description.hints).toBeDefined();
			expect(shapiOpenInGvim.description.hints).toHaveLength(1);
			const hint = shapiOpenInGvim.description.hints?.[0];
			expect(hint?.type).toBe('info');
			expect(hint?.location).toBe('ndv');
			expect(hint?.whenToDisplay).toBe('always');
		});
	});

	describe('execute', () => {
		it('should generate helper HTML with basic parameters', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/test.txt',
				line: 0,
				column: 0,
				encoding: '',
				timeout: 300,
				createIfMissing: false
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			
			// Mock the prepareBinaryData method
			const mockBinaryData = {
				data: Buffer.from('mock html'),
				mimeType: 'text/html',
				fileName: 'shapi_open_gvim_helper.html',
			};
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(mockBinaryData);

			// Copy the instance methods to the mock context
			Object.setPrototypeOf(mockExecuteFunctions, shapiOpenInGvim);
			// Copy the instance methods to the mock context
			Object.setPrototypeOf(mockExecuteFunctions, shapiOpenInGvim);
			const result = await shapiOpenInGvim.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json).toMatchObject({
				filePath: '/tmp/test.txt',
				gvimCommand: "gvim -- '/tmp/test.txt'",
				shapiUrl: 'http://localhost:3000',
				timeout: 300,
				helperGenerated: true,
				shapiRequest: {
					url: 'http://localhost:3000/execute',
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: {
						command: "gvim -- '/tmp/test.txt'",
						timeout: 300,
					},
				},
			});

			expect(result[0][0]?.binary?.helper).toBeDefined();
			expect(mockExecuteFunctions.helpers.prepareBinaryData).toHaveBeenCalledWith(
				expect.any(Buffer),
				'shapi_open_gvim_helper.html',
				'text/html'
			);
		});


		it('should include line and column in cursor command', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/home/user/code.js',
				line: 42,
				column: 15,
				encoding: '',
				timeout: 300,
				createIfMissing: false
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			
			const mockBinaryData = { data: Buffer.from('mock html') };
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(mockBinaryData);

			// Copy the instance methods to the mock context
			Object.setPrototypeOf(mockExecuteFunctions, shapiOpenInGvim);
			const result = await shapiOpenInGvim.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json.gvimCommand).toBe('gvim +"call cursor(42, 15)" -- \'/home/user/code.js\'');
		});

		it('should include line only when column is not specified', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/home/user/readme.md',
				line: 25,
				column: 0,
				encoding: '',
				timeout: 300,
				createIfMissing: false
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			
			const mockBinaryData = { data: Buffer.from('mock html') };
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(mockBinaryData);

			// Copy the instance methods to the mock context
			Object.setPrototypeOf(mockExecuteFunctions, shapiOpenInGvim);
			const result = await shapiOpenInGvim.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json.gvimCommand).toBe('gvim +25 -- \'/home/user/readme.md\'');
		});

		it('should include encoding setting when specified', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/korean.txt',
				line: 0,
				column: 0,
				encoding: 'euc-kr',
				timeout: 300,
				createIfMissing: false
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			
			const mockBinaryData = { data: Buffer.from('mock html') };
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(mockBinaryData);

			// Copy the instance methods to the mock context
			Object.setPrototypeOf(mockExecuteFunctions, shapiOpenInGvim);
			const result = await shapiOpenInGvim.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json.gvimCommand).toBe('gvim +"set fileencoding=euc-kr" -- \'/tmp/korean.txt\'');
		});

		it('should handle file creation when createIfMissing is true for Unix', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/new/dir/newfile.txt',
				line: 0,
				column: 0,
				encoding: '',
				timeout: 300,
				createIfMissing: true
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			
			const mockBinaryData = { data: Buffer.from('mock html') };
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(mockBinaryData);

			// Copy the instance methods to the mock context
			Object.setPrototypeOf(mockExecuteFunctions, shapiOpenInGvim);
			const result = await shapiOpenInGvim.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json.gvimCommand).toBe('mkdir -p "/tmp/new/dir" && touch "/tmp/new/dir/newfile.txt" && gvim -- \'/tmp/new/dir/newfile.txt\'');
		});


		it('should handle complex combination of parameters', async () => {
			const mockParameters = {
				shapiUrl: 'https://myserver.com:8080',
				filePath: '/home/user/My Documents/file with spaces.txt',
				line: 100,
				column: 50,
				encoding: 'utf-8',
				timeout: 600,
				createIfMissing: false
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			
			const mockBinaryData = { data: Buffer.from('mock html') };
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(mockBinaryData);

			// Copy the instance methods to the mock context
			Object.setPrototypeOf(mockExecuteFunctions, shapiOpenInGvim);
			const result = await shapiOpenInGvim.execute.call(mockExecuteFunctions);

			expect(result[0][0]?.json.gvimCommand).toBe('gvim +"call cursor(100, 50)" +"set fileencoding=utf-8" -- \'/home/user/My Documents/file with spaces.txt\'');
			expect(result[0][0]?.json.shapiUrl).toBe('https://myserver.com:8080');
			expect(result[0][0]?.json.timeout).toBe(600);
		});

		it('should handle multiple input items', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/test.txt',
				line: 0,
				column: 0,
				encoding: '',
				timeout: 300,
				createIfMissing: false
			};

			const inputData = createMockInputData([{ id: 1 }, { id: 2 }]);
			mockExecuteFunctions = createMockExecuteFunctions(mockParameters, inputData);
			
			const mockBinaryData = { data: Buffer.from('mock html') };
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(mockBinaryData);

			// Copy the instance methods to the mock context
			Object.setPrototypeOf(mockExecuteFunctions, shapiOpenInGvim);
			const result = await shapiOpenInGvim.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(2);
			expect((result[0][0].pairedItem as any).item).toBe(0);
			expect((result[0][1].pairedItem as any).item).toBe(1);
			expect(mockExecuteFunctions.helpers.prepareBinaryData).toHaveBeenCalledTimes(2);
		});

		it('should handle errors gracefully when continueOnFail is true', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/invalid/path.txt',
				line: 0,
				column: 0,
				encoding: '',
				timeout: 300,
				createIfMissing: false
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(true);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockRejectedValue(new Error('Binary data error'));

			// Copy the instance methods to the mock context
			Object.setPrototypeOf(mockExecuteFunctions, shapiOpenInGvim);
			const result = await shapiOpenInGvim.execute.call(mockExecuteFunctions);

			expect(result[0]).toHaveLength(1);
			expect(result[0][0]?.json).toEqual({ 
				error: 'Binary data error',
				filePath: '/invalid/path.txt'
			});
		});

		it('should throw error when continueOnFail is false', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/invalid/path.txt',
				line: 0,
				column: 0,
				encoding: '',
				timeout: 300,
				createIfMissing: false
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			(mockExecuteFunctions.continueOnFail as jest.Mock).mockReturnValue(false);
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockRejectedValue(new Error('Binary data error'));

			// Copy the instance methods to the mock context
			Object.setPrototypeOf(mockExecuteFunctions, shapiOpenInGvim);
			await expect(shapiOpenInGvim.execute.call(mockExecuteFunctions)).rejects.toThrow('Binary data error');
		});
	});

	describe('Command Building', () => {
		it('should properly quote Unix paths with special characters', async () => {
			const testPaths = [
				'/home/user/file with spaces.txt',
				"/home/user/file's name.txt",
				'/home/user/file"with"quotes.txt',
				'/home/user/$pecial/file.txt',
			];

			const expectedCommands = [
				"gvim -- '/home/user/file with spaces.txt'",
				"gvim -- '/home/user/file'\\''s name.txt'",
				"gvim -- '/home/user/file\"with\"quotes.txt'",
				"gvim -- '/home/user/$pecial/file.txt'",
			];

			for (let i = 0; i < testPaths.length; i++) {
				const mockParameters = {
					shapiUrl: 'http://localhost:3000',
					filePath: testPaths[i],
					line: 0,
					column: 0,
					encoding: '',
					timeout: 300,
						createIfMissing: false
				};

				mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
				
				const mockBinaryData = { data: Buffer.from('mock html') };
				(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockResolvedValue(mockBinaryData);

				// Copy the instance methods to the mock context
			Object.setPrototypeOf(mockExecuteFunctions, shapiOpenInGvim);
			const result = await shapiOpenInGvim.execute.call(mockExecuteFunctions);
				expect(result[0][0]?.json.gvimCommand).toBe(expectedCommands[i]);
			}
		});

	});

	describe('HTML Generation', () => {
		it('should generate valid HTML helper content', async () => {
			const mockParameters = {
				shapiUrl: 'http://localhost:3000',
				filePath: '/tmp/test.txt',
				line: 0,
				column: 0,
				encoding: '',
				timeout: 300,
				createIfMissing: false
			};

			mockExecuteFunctions = createMockExecuteFunctions(mockParameters);
			
			let capturedHtml = '';
			(mockExecuteFunctions.helpers.prepareBinaryData as jest.Mock).mockImplementation(async (buffer: Buffer) => {
				capturedHtml = buffer.toString('utf8');
				return { data: buffer };
			});

			// Copy the instance methods to the mock context
			Object.setPrototypeOf(mockExecuteFunctions, shapiOpenInGvim);
			await shapiOpenInGvim.execute.call(mockExecuteFunctions);

			expect(capturedHtml).toContain('<!doctype html>');
			expect(capturedHtml).toContain('Open in gVim — SHAPI');
			expect(capturedHtml).toContain('http://localhost:3000/execute');
			expect(capturedHtml).toContain("gvim -- '/tmp/test.txt'");
			expect(capturedHtml).toContain('JSON');
			expect(capturedHtml).toContain('Form POST');
		});
	});
});