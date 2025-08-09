import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeConnectionType,
} from 'n8n-workflow';

import { shapiApiRequest } from './GenericFunctions';

export class ShapiOpenInGvim implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'SHAPI Open in gVim',
		name: 'shapiOpenInGvim',
		icon: 'file:shapi2.svg',
		group: ['SHAPI'],
		version: 1,
		description: 'Create a clickable helper page to open a file in gVim via SHAPI server',
		defaults: {
			name: 'SHAPI Open in gVim',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		hints: [
			{
				type: 'info',
				location: 'ndv',
				whenToDisplay: 'always',
				message:
					'After execution, open the generated <b>helper HTML</b> in the output and click <b>Open in gVim</b>.\n' +
					'Your SHAPI server must be running and accessible at the specified URL.',
			},
		],
		properties: [
			{
				displayName: 'SHAPI URL',
				name: 'shapiUrl',
				type: 'string',
				default: '',
				placeholder: 'http://localhost:3000',
				description: 'The SHAPI server URL',
				required: true,
			},
			{
				displayName: 'File Path',
				name: 'filePath',
				type: 'string',
				default: '',
				placeholder: '/path/to/file.txt',
				description: 'Absolute path to the file to open',
				required: true,
			},
			{
				displayName: 'Line',
				name: 'line',
				type: 'number',
				default: 0,
				description: 'Optional. Jump to this line number',
			},
			{
				displayName: 'Column',
				name: 'column',
				type: 'number',
				default: 0,
				description: 'Optional. Jump to this column (if line is set)',
			},
			{
				displayName: 'Encoding',
				name: 'encoding',
				type: 'options',
				default: '',
				options: [
					{ name: 'Auto (default)', value: '' },
					{ name: 'UTF-8', value: 'utf-8' },
					{ name: 'EUC-KR', value: 'euc-kr' },
					{ name: 'ISO-8859-1', value: 'iso-8859-1' },
				],
				description: 'File encoding to use when opening the file',
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: 300,
				description: 'Timeout in seconds for the gVim session',
				required: false,
			},
			{
				displayName: 'Create File if Missing',
				name: 'createIfMissing',
				type: 'boolean',
				default: false,
				description: 'Whether to create the file if it does not exist',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const shapiUrl = this.getNodeParameter('shapiUrl', i) as string;
				const filePath = this.getNodeParameter('filePath', i) as string;
				const line = this.getNodeParameter('line', i) as number;
				const column = this.getNodeParameter('column', i) as number;
				const encoding = this.getNodeParameter('encoding', i) as string;
				const timeout = this.getNodeParameter('timeout', i) as number;
				const createIfMissing = this.getNodeParameter('createIfMissing', i) as boolean;

				// Build gVim command
				const gvimCommand = (this as any).buildGvimCommand(filePath, {
					line,
					column,
					encoding,
					createIfMissing,
				});

				// Build helper HTML
				const helperHtml = (this as any).buildHelperHtml({
					command: gvimCommand,
					timeout: timeout * 1000, // Convert to milliseconds
					shapiUrl,
				});

				// Create binary data for the HTML helper
				const helperBuffer = Buffer.from(helperHtml, 'utf8');
				const binaryData = await this.helpers.prepareBinaryData(
					helperBuffer,
					'shapi_open_gvim_helper.html',
					'text/html',
				);

				returnData.push({
					json: {
						filePath,
						gvimCommand,
						shapiUrl,
						timeout,
						helperGenerated: true,
						shapiRequest: {
							url: `${shapiUrl}/execute`,
							method: 'POST',
							headers: { 'Content-Type': 'application/json' },
							body: {
								command: gvimCommand,
								timeout,
							},
						},
					},
					binary: {
						helper: binaryData,
					},
					pairedItem: {
						item: i,
					},
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
							filePath: this.getNodeParameter('filePath', i) as string,
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

	buildGvimCommand(
		filePath: string,
		options: {
			line?: number;
			column?: number;
			encoding?: string;
			createIfMissing?: boolean;
		},
	): string {
		const { line = 0, column = 0, encoding = '', createIfMissing = false } = options;

		const quoted = (this as any).quoteUnix(filePath);

		let cursorCmd = '';
		if (line > 0 && column > 0) {
			cursorCmd = `+"call cursor(${line}, ${column})"`;
		} else if (line > 0) {
			cursorCmd = `+${line}`;
		}

		let encodingCmd = '';
		if (encoding) {
			encodingCmd = ` +"set fileencoding=${encoding}"`;
		}

		const executable = 'gvim';
		let command = `${executable} ${cursorCmd}${encodingCmd} -- ${quoted}`.trim();

		// Handle file creation if requested
		if (createIfMissing) {
			const dirPath = filePath.substring(0, filePath.lastIndexOf('/'));
			const mkdirCmd = `mkdir -p "${dirPath}"`;
			const touchCmd = `touch "${filePath}"`;
			command = `${mkdirCmd} && ${touchCmd} && ${command}`;
		}

		return command.replace(/\s+/g, ' ').trim();
	}

	quoteUnix(path: string): string {
		const escaped = path.replace(/'/g, "'\\''");
		return `'${escaped}'`;
	}

	escapeHtml(text: string): string {
		return text
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;');
	}

	buildHelperHtml(params: { command: string; timeout: number; shapiUrl: string }): string {
		const { command, timeout, shapiUrl } = params;
		const escapedCommand = this.escapeHtml(command);
		const executeUrl = `${shapiUrl}/execute`;

		return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Open in gVim — SHAPI</title>
  <style>
    body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 24px; background: #f8fafc; }
    .card { max-width: 720px; margin: 0 auto; padding: 24px; background: white; border-radius: 12px; box-shadow: 0 4px 16px rgba(0,0,0,.08); }
    h1 { font-size: 24px; margin: 0 0 16px; color: #111827; }
    .subtitle { color: #6b7280; margin-bottom: 20px; }
    code, pre { background: #f3f4f6; padding: 4px 8px; border-radius: 6px; font-family: 'Monaco', 'Menlo', monospace; }
    .command-box { background: #1f2937; color: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0; word-break: break-all; }
    .buttons { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 20px; }
    button { padding: 12px 16px; border: 0; border-radius: 8px; cursor: pointer; font-weight: 500; }
    button.primary { background: #3b82f6; color: white; }
    button.primary:hover { background: #2563eb; }
    button.secondary { background: #e5e7eb; color: #374151; }
    button.secondary:hover { background: #d1d5db; }
    .status { margin-top: 16px; padding: 12px; border-radius: 6px; display: none; }
    .status.success { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; }
    .status.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
    .response { margin-top: 12px; background: #f9fafb; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; white-space: pre-wrap; word-break: break-word; font-family: monospace; font-size: 12px; display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h1>🚀 Open in gVim via SHAPI</h1>
    <p class="subtitle">Execute gVim command through your SHAPI server</p>
    
    <div>
      <strong>SHAPI Endpoint:</strong> <code>${executeUrl}</code>
    </div>
    
    <div class="command-box">
      <strong>Command:</strong><br>
      ${escapedCommand}
    </div>

    <div class="buttons">
      <button class="primary" id="executeBtn">🎯 Open in gVim (JSON)</button>
      <form action="${executeUrl}" method="post" target="_blank" style="display:inline-block;">
        <input type="hidden" name="command" value="${command}" />
        <input type="hidden" name="timeout" value="${Math.floor(timeout / 1000)}" />
        <button type="submit" class="secondary">📝 Open in gVim (Form POST)</button>
      </form>
    </div>

    <div id="status" class="status"></div>
    <div id="response" class="response"></div>
  </div>

  <script>
    const executeBtn = document.getElementById('executeBtn');
    const statusDiv = document.getElementById('status');
    const responseDiv = document.getElementById('response');

    executeBtn.addEventListener('click', async () => {
      statusDiv.className = 'status';
      statusDiv.style.display = 'block';
      statusDiv.textContent = '⏳ Sending request to SHAPI server...';
      responseDiv.style.display = 'none';

      try {
        const response = await fetch('${executeUrl}', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            command: '${command.replace(/'/g, "\\'")}', 
            timeout: ${Math.floor(timeout / 1000)} 
          }),
        });

        const responseText = await response.text();
        
        if (response.ok) {
          statusDiv.className = 'status success';
          statusDiv.innerHTML = '✅ gVim opened successfully! Check your desktop.';
        } else {
          statusDiv.className = 'status error';
          statusDiv.innerHTML = '❌ SHAPI server error: ' + response.status + ' ' + response.statusText;
        }
        
        if (responseText) {
          responseDiv.textContent = responseText;
          responseDiv.style.display = 'block';
        }
      } catch (error) {
        statusDiv.className = 'status error';
        statusDiv.innerHTML = '❌ Failed to reach SHAPI server. Is it running and accessible?';
        responseDiv.textContent = String(error);
        responseDiv.style.display = 'block';
      }
    });
  </script>
</body>
</html>`;
	}
}