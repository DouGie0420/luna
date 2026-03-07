# Moltbook AI智能体注册脚本
# 运行此脚本注册新的Moltbook AI身份

# 配置
 = " ArbiterNova\
 = \Full-stack developer and crypto arbitrage specialist. Building open-source trading tools sharing technical insights and exploring Web3 agent ecosystems.\

Write-Host \🦞 注册Moltbook AI智能体: \ -ForegroundColor Cyan
Write-Host \描述: \ -ForegroundColor Gray

# 创建请求体
 = @{
 name = 
 description = 
} | ConvertTo-Json

try {
 Write-Host \发送注册请求到Moltbook...\ -ForegroundColor Yellow
 
 # 注册智能体
 = Invoke-RestMethod 
 -Uri \https://www.moltbook.com/api/v1/agents/register\ 
 -Method Post 
 -Body 
 -ContentType \application/json\ 
 -ErrorAction Stop
 
 Write-Host \✅ 注册成功!\ -ForegroundColor Green
 
 # 提取关键信息
 = .agent.api_key
 = .agent.claim_url
 = .agent.verification_code
 
 # 显示重要信息
 Write-Host \\
 Write-Host \=== 🔑 重要信息 ===\ -ForegroundColor Red
 Write-Host \API密钥:  ...\ -ForegroundColor Yellow
 Write-Host \认领链接: \ -ForegroundColor Cyan
 Write-Host \验证码: \ -ForegroundColor Magenta
 Write-Host \\
 
 # 保存到配置文件
 = \C:\Users\Administrator\Website\arbitrage-tools\config\
 if (-not (Test-Path )) {
 New-Item -ItemType Directory -Path -Force | Out-Null
 }
 
 = Join-Path \moltbook-config.json\
 = @{
 agent_name = 
 api_key = 
 claim_url = 
 verification_code = 
 registered_at = (Get-Date -Format \yyyy-MM-ddTHH:mm:ss\)
 description = 
 } | ConvertTo-Json -Depth 10
 
 | Out-File -Encoding UTF8
 Write-Host \✅ 配置已保存到: \ -ForegroundColor Green
 
 # 保存API密钥到.env文件（如果存在）
 = \C:\Users\Administrator\Website\arbitrage-tools\.env\
 if (Test-Path ) {
 = Get-Content -Raw
 if ( -notmatch \MOLTBOOK_API_KEY\) {
 Add-Content \\
# Moltbook API\
MOLTBOOK_API_KEY=\
 Write-Host \✅ API密钥已添加到.env文件\ -ForegroundColor Green
 }
 }
 
 Write-Host \\
 Write-Host \=== 📋 下一步操作 ===\ -ForegroundColor Cyan
 Write-Host \1. 打开认领链接: \ -ForegroundColor White
 Write-Host \2. 验证你的邮箱\ -ForegroundColor White
 Write-Host \3. 发布验证推文\ -ForegroundColor White
 Write-Host \4. 智能体将被激活!\ -ForegroundColor White
 Write-Host \\
 Write-Host \完成后，运行测试脚本验证连接:\ -ForegroundColor Gray
 
} catch {
 Write-Host \❌ 注册失败!\ -ForegroundColor Red
 Write-Host \错误信息: \ -ForegroundColor Red
 
 if (.Exception.Response) {
 = .Exception.Response.StatusCode.value__
 Write-Host \HTTP状态码: \ -ForegroundColor Red
 
 = New-Object System.IO.StreamReader(.Exception.Response.GetResponseStream())
 .BaseStream.Position = 0
 .DiscardBufferedData()
 = .ReadToEnd()
 Write-Host \错误响应: \ -ForegroundColor Red
 }
 
 exit 1
}

Write-Host \🦞 注册流程完成! 请按照上述步骤完成认领。\ -ForegroundColor Green
