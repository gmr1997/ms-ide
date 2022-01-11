import * as vscode from 'vscode';
import * as fs from 'fs';

/**
 * 接收用户输入内容的接口
 */
interface ConfInfo{
    // 浏览器cookie
    cookie: string;
    // 可以是ip，也可以是域名
    host: string;
}

/**
 * 弹出输入框，并获取输入框内容写到配置文件中
 */
export class GetUserInput {

    public getCookie(){
        vscode.window.showInputBox({placeHolder:'请输入Cookie', ignoreFocusOut:true, prompt:'按回车确认，按ESC取消输入'}).then(function(msg){
            let confInfo: ConfInfo = {cookie:'undefined', host:'localhost'};
            let confFileDir = process.env.USERPROFILE + '\\.mside';
            let confFilePath = process.env.USERPROFILE + '\\.mside\\conf.json';
            console.log('用户输入的Cookie为：:' + msg);

            updateConf('cookie', msg!, confFilePath, confFileDir, confInfo);
        });
        
    }

    public getHost(){
        vscode.window.showInputBox({placeHolder:'请输入host', ignoreFocusOut:true, prompt:'按回车确认，按ESC取消输入'}).then(function(msg){
            let confInfo: ConfInfo = {cookie:'undefined', host:'localhost'};
            let confFileDir = process.env.USERPROFILE + '\\.mside';
            let confFilePath = process.env.USERPROFILE + '\\.mside\\conf.json';
            console.log('用户输入的host为：:' + msg);

            updateConf('host', msg!, confFilePath, confFileDir, confInfo);
        });
    }
}

/**
 * 获取用户input输入的配置信息，写入配置文件
 * 
 * @param type 用户输入信息类型
 * @param msg 输入的内容
 * @param confFilePath 配置文件路径
 * @param confFileDir 配置文件父目录
 * @param confInfo 配置文件初始化信息
 */
function updateConf(type: string, msg: string, confFilePath: string, confFileDir: string, confInfo: ConfInfo){
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
                        let temp: ConfInfo = {cookie:confFile.cookie, host:confFile.host};
                        if (type === 'cookie'){
                            temp.cookie = msg;
                        } else if (type === 'host') {
                            temp.host = msg;
                        }
                        fs.writeFileSync(confFilePath, JSON.stringify(temp));
                    });
                    
                });

            } else {
                console.log(confFilePath + '文件存在，stats为：' + JSON.stringify(stats));
                const confFile = require(confFilePath);
                let temp: ConfInfo = {cookie:confFile.cookie, host:confFile.host};
                if (type === 'cookie'){
                    temp.cookie = msg;
                } else if (type === 'host') {
                    temp.host = msg;
                }
                fs.writeFileSync(confFilePath, JSON.stringify(temp));
            }
        });
    }
}