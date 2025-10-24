#!/usr/bin/env node

/**
 * Git 提交脚本
 * 遵循项目规范的提交消息格式
 *
 * 使用方法：
 * node scripts/commit.js
 *
 * 或者 package.json 中添加脚本：
 * "scripts": {
 *   "commit": "node scripts/commit.js"
 * }
 */

const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// 提交类型选项
const COMMIT_TYPES = {
  feat: '新功能',
  fix: '修复bug',
  docs: '文档更新',
  style: '代码格式化（不影响功能）',
  refactor: '代码重构',
  perf: '性能优化',
  test: '测试相关',
  chore: '构建过程或辅助工具的变动'
};

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function getCommitType() {
  console.log('\n📝 选择提交类型:');
  Object.entries(COMMIT_TYPES).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });

  const type = await question('\n请输入提交类型 (feat/fix/docs等): ');
  if (!COMMIT_TYPES[type]) {
    console.log(`❌ 无效的类型: ${type}`);
    return getCommitType();
  }
  return type;
}

async function getCommitSubject() {
  const subject = await question('请输入提交标题 (简洁描述): ');
  if (!subject.trim()) {
    console.log('❌ 提交标题不能为空');
    return getCommitSubject();
  }
  return subject.trim();
}

async function getCommitBody() {
  console.log('\n📄 提交详细描述 (可选，空行结束):');
  const lines = [];

  while (true) {
    const line = await question('');
    if (line === '') break;
    lines.push(line);
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

function generateCommitMessage(type, subject, body) {
  let message = `${type}: ${subject}`;

  if (body) {
    message += '\n\n';
    // 将body转换为项目规范格式（每行以 - 开头）
    const bodyLines = body.split('\n').filter((line) => line.trim());
    if (bodyLines.length > 0) {
      message += bodyLines.map((line) => `- ${line.trim()}`).join('\n');
    }
  }

  message +=
    '\n\n🤖 Generated with [Claude Code](https://claude.ai/code)\nCo-Authored-By: Claude <noreply@anthropic.com>';

  return message;
}

async function main() {
  try {
    console.log('🚀 Git 提交助手');
    console.log('📋 当前工作目录:', process.cwd());

    // 检查是否有未提交的更改
    const status = execSync('git status --porcelain', { encoding: 'utf8' });
    if (!status.trim()) {
      console.log('✅ 没有未提交的更改');
      rl.close();
      return;
    }

    console.log('📦 发现未提交的更改:');
    console.log(status);

    const type = await getCommitType();
    const subject = await getCommitSubject();
    const body = await getCommitBody();

    const commitMessage = generateCommitMessage(type, subject, body);

    console.log('\n📄 生成的提交消息:');
    console.log('─'.repeat(50));
    console.log(commitMessage);
    console.log('─'.repeat(50));

    const confirm = await question('\n确认提交吗? (y/N): ');
    if (confirm.toLowerCase() === 'y' || confirm.toLowerCase() === 'yes') {
      // 添加所有更改
      execSync('git add .', { stdio: 'inherit' });

      // 创建提交
      execSync(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, { stdio: 'inherit' });

      console.log('✅ 提交成功!');
    } else {
      console.log('❌ 取消提交');
    }
  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    rl.close();
  }
}

main();
