import * as qs from 'qs';
import * as fs from 'fs';

const axios = require('axios');
const msHttpHeader = require('../resource/ms_http_headers.json');

/**
 * 脚本任务信息
 * 
 * 封装该信息，方便通过该类获取正在运行脚本的任务名来kill掉任务
 */
export class JobInfo{
    constructor(){};
    private jobName!:string;
    private mlsqlIp!:string;
    public getJobName(){
        return this.jobName;
    }
    public setMlsqlIp(name:string){
        this.jobName = name;
    }
    public getMlsqlIp(){
        return this.mlsqlIp;
    }
    public setJobName(ip:string){
        this.mlsqlIp = ip;
    }
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

    // 应该是控制返回条数的，每次运行脚本都会请求一次，
    // 返回100
    public async queryParam():Promise<any>{
        let res: any = '';

        let confFilePath = process.env.USERPROFILE + '\\.mside\\conf.json';
        let httpHeader = require(confFilePath);

        // data要求string格式
        var data = qs.stringify({
            'keyCode': 'limit_items',
            'defaultValue': 20
        });
        var config = {
            method: 'post',
            url: 'http://'+ httpHeader?.Host +'/bdp-web/query/queryParam',
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
    public async getMlsqlIp(type: string):Promise<any>{
        let res: any = '';

        let confFilePath = process.env.USERPROFILE + '\\.mside\\conf.json';
        let httpHeader = require(confFilePath);

        // data要求string格式
        var dataHck = qs.stringify({
            'scopeId': 1,
            'source': 'hck'
        });
        var dataIde = qs.stringify({
            'scopeId': 1,
            'source': 'ide'
        });
        if (type === 'hck'){
            var config = {
                method: 'post',
                url: 'http://'+ httpHeader?.Host +'/bdp-web/query/getMlsqlIp',
                headers: httpHeader,
                data : dataHck
            };
        } else {
            var config = {
                method: 'post',
                url: 'http://'+ httpHeader?.Host +'/bdp-web/query/getMlsqlIp',
                headers: httpHeader,
                data : dataIde
            };
        }
        
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

        let confFilePath = process.env.USERPROFILE + '\\.mside\\conf.json';
        let httpHeader = require(confFilePath);

        // data要求string格式
        var data = qs.stringify({
            'scopeId': 1,
            'checkSql': checkRiskSql,
            'jobName': checkRiskJobName,
            'mlsqlIP': checkRiskIp
        });
        var config = {
            method: 'post',
            url: 'http://'+ httpHeader?.Host +'/bdp-web/jobSchema/checkJobScriptRisk',
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

        let confFilePath = process.env.USERPROFILE + '\\.mside\\conf.json';
        let httpHeader = require(confFilePath);

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
            url: 'http://'+ httpHeader?.Host +'/bdp-web/query/run/script',
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

        let jobInfo = new JobInfo();

        console.log('====开始queryParam====');
        let queryParamRes = await this.queryParam();
        if (queryParamRes.status !== 200){
            return {'data':'queryParam请求失败，请检查是否已经配置Cookie'};
        }

        console.log('====开始getCheckRiskMlsqlIp====');
        let getCheckRiskMlsqlIpRes = await this.getMlsqlIp('hck');
        if (getCheckRiskMlsqlIpRes.data.jobName === undefined){
            return {'data':'getMlsqlIp请求失败'};
        }

        console.log('====开始checkJobScriptRisk====');
        let checkJobScriptRiskRes = await this.checkJobScriptRisk(sql, getCheckRiskMlsqlIpRes.data.mlsqlIP, getCheckRiskMlsqlIpRes.data.jobName);
        if (!checkJobScriptRiskRes.data.header.flag){
            return {'data':'checkJobScriptRisk请求失败'};
        }
        
        console.log('====开始getRunMlsqlIp====');
        let getRunMlsqlIpRes = await this.getMlsqlIp('ide');
        if (getRunMlsqlIpRes.data.jobName === ''){
            return {'data':'getMlsqlIp请求失败'};
        }

        jobInfo.setJobName(getRunMlsqlIpRes.data.jobName);
        jobInfo.setMlsqlIp(getRunMlsqlIpRes.data.mlsqlIp);
        console.log(jobInfo);

        console.log('====开始script====');
        let scriptRes = await this.script(sql, getRunMlsqlIpRes.data.mlsqlIP, getRunMlsqlIpRes.data.jobName);
        console.log(scriptRes);
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