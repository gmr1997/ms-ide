import * as vscode from 'vscode';
import { TextDecoder, TextEncoder } from 'util';
import { HttpRequestRunScript } from './requests';
const { jsonToHTMLTable } = require('nested-json-to-table');

/**
 * 该文件主要功能：
 *  1.序列化notebook文件
 *  2.渲染运行结果
 */


interface RawNotebookCell {
  language: string;
  value: string;
  kind: vscode.NotebookCellKind;
}

export class SampleSerializer implements vscode.NotebookSerializer {
  async deserializeNotebook(
    content: Uint8Array,
    _token: vscode.CancellationToken
  ): Promise<vscode.NotebookData> {
    var contents = new TextDecoder().decode(content);

    let raw: RawNotebookCell[];
    try {
      raw = <RawNotebookCell[]>JSON.parse(contents);
    } catch {
      raw = [];
    }

    const cells = raw.map(
      item => new vscode.NotebookCellData(item.kind, item.value, item.language)
    );
    return new vscode.NotebookData(cells);
  }

  async serializeNotebook(
    data: vscode.NotebookData,
    _token: vscode.CancellationToken
  ): Promise<Uint8Array> {
    let contents: RawNotebookCell[] = [];

    for (const cell of data.cells) {
      contents.push({
        kind: cell.kind,
        language: cell.languageId,
        value: cell.value
      });
    }
    return new TextEncoder().encode(JSON.stringify(contents));
  }
}

export class Controller {
    readonly controllerId = 'mlsql-notebook-controller-id';
    readonly notebookType = 'mlsql';
    readonly label = 'MLSQL NoteBook';
    readonly supportedLanguages = ['sql','python'];
  
    private readonly _controller: vscode.NotebookController;
    private _executionOrder = 0;
  
    constructor() {
      this._controller = vscode.notebooks.createNotebookController(
        this.controllerId,
        this.notebookType,
        this.label
      );
  
      this._controller.supportedLanguages = this.supportedLanguages;
      this._controller.supportsExecutionOrder = true;
      this._controller.executeHandler = this._execute.bind(this);
      this._controller.interruptHandler = this._interrupt.bind(this);
    }
  
    private _execute(
      cells: vscode.NotebookCell[],
      _notebook: vscode.NotebookDocument,
      _controller: vscode.NotebookController
    ): void {
      for (let cell of cells) {
        this._doExecution(cell);
      }
    }


    private _interrupt(_notebook: vscode.NotebookDocument): void {
      // 目前无法获取被选中的cell
    }
  
    private async _doExecution(cell: vscode.NotebookCell): Promise<void> {
      const execution = this._controller.createNotebookCellExecution(cell);
      execution.executionOrder = ++this._executionOrder;
      execution.start(Date.now()); // Keep track of elapsed time to execute cell.
      
      /* Do some execution here; not implemented */
      let code = cell.document.getText();
      console.log('正在运行:' + code);

      // await this.sleep(3000);
      // console.log('当前运行的Order:' + execution.executionOrder);
      // execution.replaceOutput([
      //   new vscode.NotebookCellOutput([
      //     vscode.NotebookCellOutputItem.text('测试结果')
      //   ])
      // ]);
      
      let runScript = new HttpRequestRunScript();
      let resultJson = await runScript.runSqlScriptSafty(code);
      // let resultJson = await runScript.queryParam();
      
      console.log('resultJson.data为：' + resultJson.data);

      let result : vscode.NotebookCellOutputItem = vscode.NotebookCellOutputItem.text('未定义');

      try {
        let resultDataString = resultJson.data.replace('[','').replace(']','');
        // 字符串解析为JSON对象
        let resultDataJson = JSON.parse(resultDataString);
        // JSON对象解析为html表格，让notebook渲染表格
        result = vscode.NotebookCellOutputItem.text(jsonToHTMLTable([resultDataJson]),'text/html');
      } catch (error) {
        // 异常一般是因为sql语法有问题，返回的数据不是想要的，导致解析JSON失败，这里直接让notebook渲染服务器返回的异常信息
        result = vscode.NotebookCellOutputItem.error(new Error(resultJson.data));
      }
      execution.replaceOutput([
        new vscode.NotebookCellOutput([
          result,
          // vscode.NotebookCellOutputItem.json(result),
          // vscode.NotebookCellOutputItem.text(result, 'text/html'),
        ])
      ]);
      
      execution.end(true, Date.now());
    }

    // 停止单元格代码运行
    private async _doInterrupt(cell: vscode.NotebookCell): Promise<void>{

    }

    private sleep(delay : number){
      return new Promise((resolve) => setTimeout(resolve, delay));
    }

    public dispose() {
        this.dispose();
    }
  }