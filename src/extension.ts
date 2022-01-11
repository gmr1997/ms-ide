import * as vscode from 'vscode';
import {SampleSerializer,Controller} from './notebook';
import { GetUserInput } from './userinput';

export function activate(context: vscode.ExtensionContext) {

	// hello world命令
	let helloworld = vscode.commands.registerCommand('ms-ide.helloWorld', () => {
		vscode.window.showInformationMessage('Hello World from ms-ide!');
	});

	let inputCookie = vscode.commands.registerCommand('ms-ide.inputCookie', () => {
		let conf = new GetUserInput();
		conf.getCookie();
	});

	let inputHost = vscode.commands.registerCommand('ms-ide.inputHost', () => {
		let conf = new GetUserInput();
		conf.getHost();
		
	});

	// mlsql notebook文件序列化
	let notebook = vscode.workspace.registerNotebookSerializer('mlsql', new SampleSerializer());

	// mslql notebook Controller
	let notebookController = new Controller();

	context.subscriptions.push(helloworld);
	context.subscriptions.push(notebook);
	context.subscriptions.push(notebookController);
	context.subscriptions.push(inputCookie);
	context.subscriptions.push(inputHost);

}

export function deactivate() {}
