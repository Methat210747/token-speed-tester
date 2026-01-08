# Token 速度测试工具实现计划

## 项目概述

构建一个用于测试 LLM API token 输出速度的命令行工具，支持 **Anthropic** 和 **OpenAI** 两种协议。

**技术栈**: Node.js + TypeScript

**核心功能**:
- 支持 Anthropic Messages API 和 OpenAI Chat Completions API
- 调用流式接口，测量每个 token 的到达时间
- 测量并统计各项速度指标（TTFT、吞吐量、峰值速度等）
- 多次测试取平均值和标准差
- 终端 ASCII 图表可视化展示

---

## 项目结构

```
token-speed-tester/
├── src/
│   ├── index.ts          # CLI 入口，参数解析
│   ├── client.ts         # API 客户端封装（支持 Anthropic/OpenAI）
│   ├── metrics.ts        # 指标计算与统计
│   ├── chart.ts          # ASCII 图表生成
│   └── config.ts         # 配置管理（仅命令行参数，无配置文件）
├── tests/
│   ├── metrics.test.ts   # 指标计算单元测试
│   ├── chart.test.ts     # 图表生成单元测试
│   └── config.test.ts    # 配置解析单元测试
├── package.json
├── tsconfig.json
├── vitest.config.ts      # Vitest 配置
├── LICENSE               # MIT 协议
├── README.md
└── .gitignore
```

---

## 实现步骤

### 1. 项目初始化

创建项目目录并配置：

```bash
mkdir token-speed-tester
cd token-speed-tester
pnpm init
pnpm add @anthropic-ai/sdk openai chalk cli-table3 commander
pnpm add -D typescript @types/node tsx vitest @vitest/ui @vitest/coverage-v8
```

**依赖说明**:
- `@anthropic-ai/sdk` - Anthropic 官方 SDK
- `openai` - OpenAI 官方 SDK
- `chalk` - 终端颜色输出
- `cli-table3` - 表格展示
- `commander` - CLI 参数解析
- `vitest` - 单元测试框架
- `@vitest/ui` - 测试 UI 界面
- `@vitest/coverage-v8` - 代码覆盖率报告

**package.json 配置**:
- 添加 `bin` 字段，定义 CLI 命令名称
- 添加 `type: "module"` 使用 ES Modules
- 配置 `files` 字段指定发布文件
- 设置 `license: "MIT"`

**文件**: `package.json`, `tsconfig.json`

### 2. 配置管理 (`src/config.ts`)

- 所有参数通过命令行传入，**不使用配置文件**
- 支持的配置项：
  - `--api-key`: API Key（必填）
  - `--provider`: API 类型，`anthropic` 或 `openai`（默认: anthropic）
  - `--url`: 自定义 API endpoint（可选）
  - `--model`: 模型名称
  - `--max-tokens`: 最大输出 token 数（默认: 1024）
  - `--runs`: 测试次数（默认: 3）
  - `--prompt`: 测试用的 prompt（默认: "写一篇关于 AI 的短文"）

```typescript
type Provider = 'anthropic' | 'openai';

interface Config {
  provider: Provider;
  apiKey: string;
  baseURL?: string;
  model: string;
  maxTokens: number;
  runCount: number;
  prompt: string;
}
```

### 3. API 客户端 (`src/client.ts`)

- 封装两种 SDK 的流式调用
- 支持自定义 baseURL
- 统一两种协议的流式响应处理
- 记录每个 token chunk 的时间戳
- 返回原始计时数据供后续分析

```typescript
interface StreamMetrics {
  ttft: number;              // Time to First Token (ms)
  tokens: number[];          // 每个 token 的到达时间（相对开始时间）
  totalTokens: number;
  totalTime: number;
}

function streamTest(config: Config): Promise<StreamMetrics>
```

### 4. 指标计算 (`src/metrics.ts`)

计算各项统计指标：

- **TTFT** (Time to First Token): 首个 token 到达时间
- **总耗时**: 从请求到完成的总时间
- **总 token 数**: 输出的 token 数量
- **平均速度**: totalTokens / totalTime * 1000 (tokens/s)
- **峰值速度**: 最快连续 10 个 token 的平均速度
- **TPS 曲线**: 每秒到达的 token 数量

多次测试统计：
- 各项指标的均值、最小值、最大值、标准差

### 5. ASCII 图表生成 (`src/chart.ts`)

使用 `cli-table3` 和自定义 ASCII 绘图：

- **速度趋势图**: 横轴为时间，纵轴为 tokens/s
- **TPS 直方图**: 每秒 token 数分布
- **统计汇总表**: 展示各项指标数据

```
Token 速度趋势图
┌────────────────────────────────────────┐
│ 120 ┤                         █         │
│ 100 ┤                     █ █ █ █       │
│  80 ┤                 █ █ █ █ █ █ █     │
│  60 ┤             █ █ █ █ █ █ █ █ █ █   │
│  40 ┤         █ █ █ █ █ █ █ █ █ █ █ █   │
│  20 ┤     █ █ █ █ █ █ █ █ █ █ █ █ █ █   │
│   0 └────────────────────────────────── │
│     0s   1s   2s   3s   4s   5s   6s    │
└────────────────────────────────────────┘
```

### 6. CLI 入口 (`src/index.ts`)

使用 `commander` 解析命令行参数，定义全局 CLI 命令：

```bash
# Anthropic 官方 API
token-speed-test --api-key sk-ant-xxx

# OpenAI 官方 API
token-speed-test --api-key sk-xxx --provider openai

# 自定义选项
token-speed-test --api-key sk-xxx --provider anthropic --model claude-3-5-sonnet --runs 5 --url https://api.example.com

# 第三方兼容 OpenAI 协议
token-speed-test --api-key sk-xxx --provider openai --url https://api.example.com/v1 --model custom-model
```

**参数说明**：
| 参数 | 简写 | 说明 | 默认值 |
|------|------|------|--------|
| `--api-key` | `-k` | API Key（必填） | - |
| `--provider` | `-p` | API 类型：anthropic/openai | anthropic |
| `--model` | `-m` | 模型名称 | 根据provider自动选择 |
| `--url` | `-u` | 自定义 API endpoint | 官方endpoint |
| `--runs` | `-r` | 测试次数 | 3 |
| `--prompt` | | 测试用的 prompt | "写一篇关于 AI 的短文" |
| `--max-tokens` | | 最大输出 token 数 | 1024 |

### 7. 单元测试 (`tests/`)

使用 **Vitest** 进行单元测试，覆盖核心逻辑：

#### 测试文件结构

| 文件 | 测试内容 |
|------|----------|
| `tests/metrics.test.ts` | 指标计算逻辑测试 |
| `tests/chart.test.ts` | 图表生成函数测试 |
| `tests/config.test.ts` | 配置解析测试 |

#### 测试用例

**metrics.test.ts**:
- `calculateTTFT()` - 首字延迟计算
- `calculateAverageSpeed()` - 平均速度计算
- `calculatePeakSpeed()` - 峰值速度计算
- `calculateStats()` - 多次测试统计（均值、标准差）
- `calculateTPS()` - 每秒 token 数计算

**chart.test.ts**:
- `renderSpeedChart()` - 速度趋势图生成
- `renderTable()` - 统计表格渲染
- 验证输出字符串格式正确

**config.test.ts**:
- 命令行参数解析
- 默认值验证
- 参数校验（如 api-key 必填）

#### 测试脚本

在 `package.json` 中添加：

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage"
  }
}
```

#### 运行测试

```bash
# 运行测试
pnpm test

# 带 UI 界面运行测试
pnpm test:ui

# 生成覆盖率报告
pnpm test:coverage
```

#### 覆盖率目标

- 语句覆盖率: **100%**
- 分支覆盖率: **100%**
- 函数覆盖率: **100%**
- 行覆盖率: **100%**

**注意**: `client.ts` 包含实际 API 调用，使用 mock 进行测试，不进行真实 API 请求。所有代码路径都必须有对应的测试用例。

### 8. README 文档 (`README.md`)

包含以下内容：
- 项目简介和功能特性
- 安装步骤（`npm install -g token-speed-tester`）
- 使用说明和示例
- 命令行参数完整说明
- 输出示例截图/示例
- 发布说明

### 9. Git 仓库设置

使用 `gh` CLI 创建远程公开仓库并推送代码：

```bash
cd token-speed-tester
git init

# 创建 .gitignore 文件
cat > .gitignore << 'EOF'
node_modules/
dist/
*.log
.DS_Store
.env
.env.local
EOF

# 创建 MIT LICENSE 文件
cat > LICENSE << 'EOF'
MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

git add .
git commit -m "Initial commit: Token 速度测试工具"

# 使用 gh CLI 创建远程公开仓库
gh repo create token-speed-tester --public --source=. --remote=origin --push

# 如果需要手动连接现有仓库
# git remote add origin <your-repo-url>
# git branch -M main
# git push -u origin main
```

**说明**:
- `gh repo create`: 创建新仓库
- `--public`: 设为公开仓库
- `--source=.`: 使用当前目录作为源
- `--remote=origin`: 设置远程仓库名为 origin
- `--push`: 自动推送代码到远程仓库

---

## 测试用例

### 开发阶段测试

```bash
# 本地运行测试
pnpm tsx src/index.ts --api-key sk-xxx
pnpm tsx src/index.ts --api-key sk-xxx --provider openai --runs 5
```

### 发布后使用

```bash
# 全局安装后使用
npm install -g token-speed-tester

# 测试 Anthropic
token-speed-test --api-key sk-ant-xxx

# 测试 OpenAI
token-speed-test --api-key sk-xxx --provider openai

# 测试第三方 API
token-speed-test --api-key sk-xxx --provider openai --url https://api.example.com/v1
```

---

## 验证方式

1. **单元测试验证**
   - 运行 `pnpm test` 确保所有测试通过
   - 运行 `pnpm test:coverage` 确保覆盖率达到 100%

2. **API 调用验证**
   - 能成功调用两种 API 并获取流式响应
   - 时间戳记录准确

3. **统计指标验证**
   - TTFT、平均速度、峰值速度计算正确
   - 多次测试的平均值和标准差计算正确

4. **可视化验证**
   - ASCII 图表正确显示
   - 表格数据清晰易读

5. **CLI 体验验证**
   - 参数解析正确
   - 错误提示友好
   - help 信息完整

6. **发布验证**
   - `package.json` 配置正确
   - 可以通过 `npm install -g` 全局安装
   - CLI 命令可用

---

## 关键文件清单

| 文件 | 说明 |
|------|------|
| `token-speed-tester/src/index.ts` | CLI 入口，命令定义 |
| `token-speed-tester/src/client.ts` | API 客户端封装 |
| `token-speed-tester/src/metrics.ts` | 指标计算 |
| `token-speed-tester/src/chart.ts` | ASCII 图表生成 |
| `token-speed-tester/src/config.ts` | 配置管理（仅命令行） |
| `token-speed-tester/tests/metrics.test.ts` | 指标计算单元测试 |
| `token-speed-tester/tests/chart.test.ts` | 图表生成单元测试 |
| `token-speed-tester/tests/config.test.ts` | 配置解析单元测试 |
| `token-speed-tester/vitest.config.ts` | Vitest 测试配置 |
| `token-speed-tester/package.json` | 项目配置，含 bin 定义 |
| `token-speed-tester/tsconfig.json` | TypeScript 配置 |
| `token-speed-tester/LICENSE` | MIT 开源协议 |
| `token-speed-tester/README.md` | 项目文档 |
| `token-speed-tester/.gitignore` | Git 忽略文件 |

---

## 计划总结

| 项目 | 内容 |
|------|------|
| **协议支持** | Anthropic + OpenAI |
| **包管理器** | pnpm |
| **配置方式** | 纯命令行参数（--api-key 等） |
| **测试框架** | Vitest |
| **覆盖率目标** | **100%** |
| **开源协议** | MIT |
| **远程仓库** | gh CLI 创建公开仓库 |
| **npm 发布** | 支持（bin 配置） |
| **关键文件数** | 14 个 |
