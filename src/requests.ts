import * as qs from 'qs';
import * as fs from 'fs';

const axios = require('axios');
const msHttpHeader = require('../resource/mengshang_http_headers.json');

interface HttpHeader{
    accept: string;
    acceptEncoding: string;
    connection: string;
    acceptLanguage: string;
    contentType: string;
    cookie: string;
    host: string;
    userAgent: string;
}

/**
 * 脚本运行步骤：
 * 1.请求queryParam，确定查询返回前端显示的条数
 * 2.请求getMlsqlIp，获取脚本风险检查的机器资源(任务名称、机器ip)
 * 3.把2中获取到的资源以及脚本信息发送请求到checkJobScriptRisk，检查脚本是否有风险
 * 4.如果没有风险，再次请求getMlsqlIp获取脚本真实执行的机器资源(任务名称、机器ip)
 * 5.把4中获取到的资源以及脚本信息发送请求到runSqlScript，执行脚本
 */
export class HttpRequestRunScript {

    async initHttpHeader(){
        let confFilePath = process.env.USERPROFILE + '\\.mside\\conf.json';
        let tempHeader:HttpHeader;
        // let ifExist = await isFileExist(confFilePath);
        if (await isFileExist(confFilePath)==='文件存在') {
            const confFile = require(confFilePath);
            tempHeader = {
                accept:msHttpHeader.Accept, 
                acceptEncoding:msHttpHeader.AcceptEncoding, 
                connection:msHttpHeader.Connection, 
                acceptLanguage:msHttpHeader.AcceptLanguage, 
                contentType:msHttpHeader.ContentType,
                cookie:confFile.cookie,
                host:confFile.host,
                userAgent:msHttpHeader.userAgent
            };
            return tempHeader;
        }
    }

    // 应该是控制返回条数的，每次运行脚本都会请求一次，
    // 返回100
    public async queryParam():Promise<any>{
        let res: any = '';

        let httpHeader = await this.initHttpHeader();

        // data要求string格式
        var data = qs.stringify({
            'keyCode': 'limit_items',
            'defaultValue': 20
        });
        var config = {
            method: 'post',
            url: 'http://'+ httpHeader?.host +'/bdp-web/query/queryParam',
            headers: httpHeader,
            data : data
        };
        await axios(config).then(function (response: { data: any; }) {
            res = response;
        }).catch(function (error: any) {
            res = error;
            console.log(error);
        });
        return res;
    }

    // 获取脚本执行机器ip
    // 返回 {"jobName":"beba9497-5320-4fdc-9898-6c4b9f35af78","mlsqlIp":"172.16.2.128:9005"}
    public async getMlsqlIp():Promise<any>{
        let res: any = '';

        let httpHeader = await this.initHttpHeader();

        // data要求string格式
        var data = qs.stringify({
            'scopeId': 1,
            'source': 'hck'
        });
        var config = {
            method: 'post',
            url: 'http://'+ httpHeader?.host +'/bdp-web/query/getMlsqlIp',
            headers: httpHeader,
            data : data
        };
        await axios(config).then(function (response: { data: any; }) {
            res = response;
        }).catch(function (error: any) {
            res = error;
            console.log(error);
        });
        return res;
    }
    
    // 脚本风险检查
    // 返回 {"header":{"msg":"SUCCESS","code":"200","flag":true},"body":"true"}
    //     {"header":{"msg":"SUCCESS","code":"200","flag":true},"body":"风险检查成功"}
    public async checkJobScriptRisk(checkRiskSql:string, checkRiskIp:string, checkRiskJobName:string):Promise<any>{
        let res: any = '';

        let httpHeader = await this.initHttpHeader();

        // data要求string格式
        var data = qs.stringify({
            'scopeId': 1,
            'checkSql': checkRiskSql,
            'jobName': checkRiskJobName,
            'mlsqlIP': checkRiskIp
        });
        var config = {
            method: 'post',
            url: 'http://'+ httpHeader?.host +'/bdp-web/jobSchema/checkJobScriptRisk',
            headers: httpHeader,
            data : data
        };
        await axios(config).then(function (response: { data: any; }) {
            res = response;
        }).catch(function (error: any) {
            res = error;
            console.log(error);
        });
        return res;
    }

    // 真实运行代码的请求
    // 返回 {"times":"0小时0分0秒","data":"[{\"a\":\"1\",\"b\":\"jack\"}]","mlsql":"172.16.2.128:9005"}
    public async script(runSql:string, runIp:string, runJobName:string):Promise<any>{
        let res = '';

        let httpHeader = await this.initHttpHeader();

        // data要求string格式
        var data = qs.stringify({
            'sql': runSql,
            'mlsqlIP': runIp,
            'jobName':runJobName,
            'scopeId': '1',
            'source': 'ide' 
        });
        var config = {
            method: 'post',
            url: 'http://'+ httpHeader?.host +'/bdp-web/query/run/script',
            headers: httpHeader,
            data : data
        };
        await axios(config).then(function (response: { data: any; }) {
            res = response.data;
        }).catch(function (error: any) {
            res = error;
            console.log(error);
        });
        return res;
    }

    // 按部就班的执行，安全
    public async runSqlScriptSafty(sql:string):Promise<any>{

        console.log('====开始queryParam====');
        let queryParamRes = await this.queryParam();
        if (queryParamRes.data !== 100){
            return {'data':'queryParam请求失败，请检查是否已经配置Cookie以及host'};
        }

        console.log('====开始getCheckRiskMlsqlIp====');
        let getCheckRiskMlsqlIpRes = await this.getMlsqlIp();
        if (getCheckRiskMlsqlIpRes.data.jobName === undefined){
            return {'data':'getMlsqlIp请求失败'};
        }

        console.log('====开始checkJobScriptRisk====');
        let checkJobScriptRiskRes = await this.checkJobScriptRisk(sql, getCheckRiskMlsqlIpRes.data.mlsqlIP, getCheckRiskMlsqlIpRes.data.jobName);
        // console.log(checkJobScriptRiskRes);
        if (!checkJobScriptRiskRes.data.header.flag){
            return {'data':'checkJobScriptRisk请求失败'};
        }
        
        console.log('====开始getRunMlsqlIp====');
        let getRunMlsqlIpRes = await this.getMlsqlIp();
        if (getRunMlsqlIpRes.data.jobName === ''){
            return {'data':'getMlsqlIp请求失败'};
        }

        console.log('====开始script====');
        let scriptRes = await this.script(sql, getRunMlsqlIpRes.data.mlsqlIP, getRunMlsqlIpRes.data.jobName);

        return scriptRes;
    }

}

function isFileExist(filePath: string):Promise<string> {
    return new Promise(function(resolve, reject){
        fs.access(filePath, (err) => {
            if(err){
                resolve('文件不存在');
            }else {
                resolve('文件存在');
            }
        });
    });
}