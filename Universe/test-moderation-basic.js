// 基本测试脚本 - 测试内容审核逻辑

// 模拟环境
if (typeof window === 'undefined') {
  global.window = { location: { origin: 'http://localhost:3002' } };
}

// 导入模块（注意：这里直接引用 .ts 文件需要 ts-node 或编译后运行）
// 这里我们直接测试函数逻辑，不实际导入

console.log('=== 内容审核系统基础测试 ===\n');

// 模拟关键词过滤（直接复制关键函数逻辑）
const BANNED_KEYWORDS = [
  '习近平', '共产党', '中共', '政府', '领导人',
  '杀死', '杀人', '暴力', '恐怖', '仇恨',
  '色情', '强奸', '性爱', '裸露',
  '毒品', '诈骗', '赌博',
];

const WARNING_KEYWORDS = [
  '傻逼', '白痴', '弱智', '垃圾',
];

function keywordModeration(text) {
  const lowerText = text.toLowerCase();

  for (const keyword of BANNED_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return {
        allowed: false,
        level: 'blocked',
        reason: `包含禁止关键词: ${keyword}`,
        violationType: 'keyword',
        penaltyPoints: 10,
      };
    }
  }

  for (const keyword of WARNING_KEYWORDS) {
    if (lowerText.includes(keyword.toLowerCase())) {
      return {
        allowed: true,
        level: 'warning',
        reason: `包含警告关键词: ${keyword}`,
        violationType: 'keyword',
        penaltyPoints: 1,
      };
    }
  }

  return {
    allowed: true,
    level: 'clean',
  };
}

// 测试用例
const testCases = [
  { text: '你好，世界！', expected: 'clean', description: '正常消息' },
  { text: '习近平是领导人', expected: 'blocked', description: '包含禁止关键词' },
  { text: '你真是个傻逼', expected: 'warning', description: '包含警告关键词' },
  { text: '今天天气不错', expected: 'clean', description: '安全消息' },
];

// 运行测试
let passed = 0;
let failed = 0;

testCases.forEach((tc, i) => {
  const result = keywordModeration(tc.text);
  const success = result.level === tc.expected;

  console.log(`测试 ${i+1}: ${tc.description}`);
  console.log(`输入: "${tc.text}"`);
  console.log(`预期: ${tc.expected}, 实际: ${result.level}`);
  console.log(`结果: ${success ? '✓ 通过' : '✗ 失败'}`);

  if (!success) {
    console.log(`详情: ${result.reason}`);
  }
  console.log('');

  if (success) passed++;
  else failed++;
});

console.log(`\n=== 测试总结 ===`);
console.log(`通过: ${passed}, 失败: ${failed}, 总计: ${testCases.length}`);

if (failed === 0) {
  console.log('✓ 所有测试通过！');
} else {
  console.log(`✗ ${failed}个测试失败`);
}