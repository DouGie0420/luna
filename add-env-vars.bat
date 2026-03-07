@echo off
echo Adding environment variables to Vercel...

vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production --yes < nul
echo AIzaSyApj0czmABuH-DSztmM5fr1x2xJAnEUgJI

vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production --yes < nul
echo studio-5896500485-92a21.firebaseapp.com

vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production --yes < nul
echo studio-5896500485-92a21

vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production --yes < nul
echo studio-5896500485-92a21.appspot.com

vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production --yes < nul
echo 163118389786

vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production --yes < nul
echo 1:163118389786:web:d826f2db9cc9b3cb140fa3

vercel env add NEXT_PUBLIC_FCM_VAPID_KEY production --yes < nul
echo BF5GP6gHehfXD-QtzzYJ-UG4TXK1Ka470rprlLtSrpAhaxhH1MwHvipLAXeARNEP09eWtEEF6MjyBWZwGH0k5Ac

vercel env add NEXT_PUBLIC_WC_PROJECT_ID production --yes < nul
echo 82acb0de1a1f61579bdadee65e01cf50

vercel env add GOOGLE_GENAI_API_KEY production --yes < nul
echo AIzaSyAFTW4rMfnYFUIAKB4vCeDXZmVf-e86emU

vercel env add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY production --yes < nul
echo AIzaSyAFTW4rMfnYFUIAKB4vCeDXZmVf-e86emU

vercel env add GEMINI_API_KEY production --yes < nul
echo AIzaSyDMVm7SE0VwVm7nd6T62x-TTUoU8TIRiQE

vercel env add NEXT_PUBLIC_CHAIN_ID production --yes < nul
echo 8453

vercel env add NEXT_PUBLIC_USDT_ADDRESS production --yes < nul
echo 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913

vercel env add NEXT_PUBLIC_ALCHEMY_API_KEY production --yes < nul
echo i2W8Dk47iLGaEhcRcwkFl

vercel env add OPENAI_API_KEY production --yes < nul
echo sk-sk-7dd34d7fb24f47368556e17365918fed

vercel env add OPENAI_BASE_URL production --yes < nul
echo https://api.deepseek.com/v1

vercel env add OPENAI_MODEL production --yes < nul
echo openai/deepseek-chat

echo.
echo All environment variables added!
echo Now redeploying...
vercel --prod --yes

pause
