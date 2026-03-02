#!/usr/bin/env node

// 检查所有可能导致Hydration错误的模式

const fs = require('fs');
const path = require('path');
const glob = require('glob');

const patterns = [
  // <p> 标签内嵌套块级元素
  /<p[^>]*>[\s\S]*?<(div|button|Button|Link|a\s)/g,
];

function checkFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  patterns.forEach((pattern, index) => {
    const matches = content.match(pattern);
    if (matches) {
      issues.push({
        file: filePath,
        pattern: index,
        matches: matches.length
      });
    }
  });
  
  return issues;
}

// 检查所有 tsx 文件
const files = glob.sync('src/**/*.tsx');
const allIssues = [];

files.forEach(file => {
  const issues = checkFile(file);
  if (issues.length > 0) {
    allIssues.push(...issues);
  }
});

console.log('Found', allIssues.length, 'potential hydration issues:');
allIssues.forEach(issue => {
  console.log(`- ${issue.file}: ${issue.matches} matches`);
});
