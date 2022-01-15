import * as vscode from 'vscode';
import * as fs from 'fs';


/**
 * 弹出输入框，并获取输入框内容写到配置文件中
 */
export class GetUserInput {

    public getCookie(){
        vscode.window.showInputBox({placeHolder:'请输入Cookie', ignoreFocusOut:true, prompt:'按回车确认，按ESC取消输入'}).then(function(msg){
            const defaultHttpHeader = require('../resource/ms_http_headers.json');
            console.log(defaultHttpHeader);
            let confFileDir = process.env.USERPROFILE + '\\.mside';
            let confFilePath = process.env.USERPROFILE + '\\.mside\\conf.json';
            console.log(`用户输入的Cookie为：:${msg}` );

            updateConf(msg!, confFilePath, confFileDir, defaultHttpHeader);
        });
        
    }
}

/**
 * 获取用户input输入的配置信息，写入配置文件
 * 
 * @param msg 输入的内容
 * @param confFilePath 配置文件路径
 * @param confFileDir 配置文件父目录
 * @param confInfo 配置文件初始化信息
 */
function updateConf(msg: string, confFilePath: string, confFileDir: string, confInfo: any){
    if (msg){
        // 读取配置文件，如果不存在则创建
        fs.stat(confFilePath, (err, stats) => {
            if (err){
                console.log(confFilePath + '文件不存在：' + err);
                // 判断目录是否存在，不存在则创建
                fs.stat(confFileDir, (err, stats) => {
                    if (err){
                        console.log(confFileDir + '文件夹不存在：' + err);
                        fs.mkdir(confFileDir, function(error){
                            if(error){
                                console.log('创建文件夹失败:' + error);
                                return false;
                            }
                        });
                        console.log(confFileDir + '文件夹新建成功');
                    }
                    fs.writeFile(confFilePath, JSON.stringify(confInfo), 'utf8', function(error){
                        if(error) {
                            console.log(confFilePath + '创建文件失败:' + error);
                            return false;
                        }
                        console.log(confFilePath + '新建文件成功');
                        const confFile = require(confFilePath);
                        confFile.Cookie = msg;
                        console.log(`替换后的Cookie为:${msg}`);
                        fs.writeFileSync(confFilePath, JSON.stringify(confFile));
                    });
                    
                });

            } else {
                console.log(confFilePath + '文件存在，stats为：' + JSON.stringify(stats));
                const confFile = require(confFilePath);
                confFile.Cookie = msg;
                console.log(`替换后的Cookie为:${msg}`);
                fs.writeFileSync(confFilePath, JSON.stringify(confFile));
                
            }
        });
    }
}