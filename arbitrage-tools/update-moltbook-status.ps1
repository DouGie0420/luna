# 更新Moltbook配置脚本
# 运行此脚本更新智能体状态为已验证

 = " C:\Users\Administrator\Website\config\moltbook-config.json\

if (Test-Path ) {
 Write-Host \📋 更新Moltbook配置...\ -ForegroundColor Cyan
 
 = Get-Content | ConvertFrom-Json
 
 # 更新状态
 .status = \claimed_verified\
 .verified_at = (Get-Date -Format \yyyy-MM-ddTHH:mm:ss\)
 .last_check = (Get-Date -Format \yyyy-MM-ddTHH:mm:ss\)
 
 # 保存更新
 | ConvertTo-Json -Depth 10 | Out-File -Encoding UTF8
 
 Write-Host \✅ 配置已更新: 状态 = claimed_verified\ -ForegroundColor Green
 Write-Host \智能体ArbiterNova已验证并激活！\ -ForegroundColor Green
 
} else {
 Write-Host \❌ 配置文件不存在: \ -ForegroundColor Red
 Write-Host \请先运行注册脚本或手动创建配置文件\ -ForegroundColor Yellow
}
