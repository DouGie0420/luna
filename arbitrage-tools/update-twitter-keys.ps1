// 更新AI密钥配置文件，添加Twitter密钥
 = " C:\Users\Administrator\Website\arbitrage-tools\config\ai-keys.json\
 = Get-Content | ConvertFrom-Json

# 更新Twitter配置
.twitter.bearer_token = \AAAAAAAAAAAAAAAAAAAAAO7n7wEAAAAAxEmnEq%2Bb3FOb9FceiNh%2Fb%2BovWDE%3DLYgBguI2huKrVVuS3VMevqdegSV874MIeUdYzOmIcbqZ80t01t\
.twitter.consumer_key = \qVCsi2DyZzEnv4OAptKJqYHQZ\
.twitter.consumer_secret = \yxKyAHR84dMgYSy6Htlan7wi17DReEDXrHsfETrgY1LfLu5YCm\
.twitter.api_version = \v2\
.twitter.status = \ready\

# 保存更新
 | ConvertTo-Json -Depth 10 | Out-File -Encoding UTF8

Write-Host \✅ Twitter API密钥已安全保存到配置文件\ -ForegroundColor Green
Write-Host \Twitter配置状态: ready\ -ForegroundColor Green
