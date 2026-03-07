const https = require('https');
const fs = require('fs');

// 从.env.production读取环境变量
const envContent = fs.readFileSync('.env.production', 'utf8');
const envVars = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

// Vercel项目信息
const projectId = 'luna-marketplace';
const teamId = '0xgoats-projects';

// 需要从Vercel获取token
console.log('请先获取Vercel Token:');
console.log('1. 访问 https://vercel.com/account/tokens');
console.log('2. 创建新token');
console.log('3. 复制token');
console.log('4. 运行: set VERCEL_TOKEN=your_token_here');
console.log('5. 然后运行: node upload-env.js');
console.log('');

const token = process.env.VERCEL_TOKEN;

if (!token) {
  console.error('错误: 请先设置VERCEL_TOKEN环境变量');
  process.exit(1);
}

// 上传环境变量
async function uploadEnvVar(key, value) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      key: key,
      value: value,
      type: 'encrypted',
      target: ['production', 'preview', 'development']
    });

    const options = {
      hostname: 'api.vercel.com',
      path: `/v10/projects/${projectId}/env?teamId=${teamId}`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          console.log(`✅ ${key} 添加成功`);
          resolve();
        } else {
          console.error(`❌ ${key} 添加失败: ${body}`);
          reject(new Error(body));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// 批量上传
async function uploadAll() {
  console.log(`开始上传 ${envVars.length} 个环境变量...`);
  
  for (const line of envVars) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=');
    
    try {
      await uploadEnvVar(key.trim(), value.trim());
      await new Promise(resolve => setTimeout(resolve, 500)); // 避免rate limit
    } catch (error) {
      console.error(`上传 ${key} 失败:`, error.message);
    }
  }
  
  console.log('\n✅ 所有环境变量上传完成！');
  console.log('现在重新部署项目...');
}

uploadAll().catch(console.error);
