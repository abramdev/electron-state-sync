# AGENTS

## 目标
- 为本仓库的自动化代理提供统一规范。
- 优先使用已有脚本和工具，避免自定义脚本。
- 所有说明以仓库内文件为准。

## 环境
- 运行时：Bun（脚本以 `bun run` 为入口）。
- 语言：TypeScript（`tsconfig.json` 启用 `strict`）。
- 模块类型：ESM（`package.json` 的 `type: module`）。
- 代码目录：`src/`。

## 快速命令
- 开发：`bun run dev`（运行 `src/index.ts`）。
- 构建：`bun run build`（`tsc` 输出到 `dist/`）。
- 测试：`bun test`。
- Lint：`bun run lint`（`oxlint src`）。
- Lint 自动修复：`bun run lint:fix`（`oxlint --fix src`）。
- 格式化：`bun run format`（`oxfmt src`）。
- 格式检查：`bun run format:check`（`oxfmt --check src`）。
- 综合检查：`bun run check`（lint + format）。

## 单测与单文件运行
- 运行单个测试文件：`bun test src/index.test.ts`。
- 运行匹配名称：`bun test -t "greet 应该返回正确的问候语"`。
- 也可用 `test.only`/`describe.only` 临时聚焦（提交前移除）。

## Git Hooks（lefthook）
- `pre-commit`：并行执行 `bun run lint` 与 `bun run format:check`。
- `pre-push`：并行执行 `bun test` 与 `bun run build`。

## Cursor / Copilot 规则
- 仓库内未发现 `.cursorrules`、`.cursor/rules/`、`.github/copilot-instructions.md`。
- 如新增规则文件，请同步更新本说明。

## 文件与格式约定（EditorConfig）
- 统一编码：UTF-8。
- 换行：LF，保存时去除尾部空格。
- 缩进：2 空格。
- 代码最大行宽：100（JS/TS）。
- Markdown 行宽不限。

## TypeScript 规范
- 允许 `strict` 下编译，禁止引入 `any` 逃逸。
- 优先使用显式类型而非隐式 `any`。
- 对外导出（`export`）必须有明确类型或推断安全。
- 公共 API 发生改变时同步更新测试。

## 导入与模块
- 使用 ESM `import`/`export`。
- 先写外部依赖，再写本地模块，分组留空行。
- 尽量使用具名导入，避免默认导入（除非库要求）。
- 同一模块多次导入时合并。
- 路径使用相对路径，除非将来增加别名。

## 命名约定
- 变量/函数：`camelCase`。
- 类/类型/接口：`PascalCase`。
- 常量：`UPPER_SNAKE_CASE`（仅全局常量）。
- 测试描述用中文或英文一致即可，但需可读。
- 按需为新增函数和关键变量补充简短注释。

## 代码结构
- 入口文件保持轻量，业务逻辑下沉到独立函数。
- 保持函数单一职责，避免过长函数。

## 错误处理
- 对外暴露的函数需明确错误形态（类型或文档）。
- 在测试中覆盖失败与成功分支。

## 测试规范（bun:test）
- 测试文件使用 `*.test.ts` 命名。
- 一个测试块只验证一个行为。
- 测试内避免共享可变状态，必要时用 `beforeEach`。

## Lint 规范（oxlint）
- 以 `bun run lint` 为准，不要直接调用 `oxlint`。
- 需要自动修复时使用 `bun run lint:fix`。
- 禁止引入未使用变量与无用导入。
- 任何新的 lint 规则必须先讨论再引入。

## 格式化（oxfmt）
- 以 `bun run format` 为准。
- 提交前执行 `bun run format:check`。
- 不手动对齐代码，交给格式化器处理。

## 提交与分支
- 不要修改 git hooks 配置。
- 提交信息使用简洁动词开头，例如 `add`/`fix`/`refactor`。
- 提交前确保 `bun run check` 通过。

## 文档更新
- 若新增脚本或运行方式，更新 `README.md`。
- 变更重要行为时补充注释或测试。

## 常见排错
- 构建失败：检查 `tsconfig.json` 与类型错误。
- Lint 失败：先运行 `bun run lint:fix`。
- 格式失败：运行 `bun run format`。
- 测试失败：使用 `bun test -t "<名称>"` 聚焦。

## 变更检查清单
- 功能是否覆盖测试。
- 是否违反 EditorConfig 行宽/缩进。
- 是否引入新的依赖或脚本。
- 是否需要更新文档。

## 文件清单（关键）
- `package.json`：脚本与工具版本。
- `tsconfig.json`：编译选项与严格度。
- `lefthook.yml`：提交前/推送前检查。
- `.editorconfig`：格式约定。
- `src/index.ts`：入口示例。
- `src/index.test.ts`：示例测试。

## 新增依赖时的要求
- 使用 Bun 安装（`bun add`/`bun add -d`）。
- 在 AGENTS.md 或 README 记录新增命令。
- 确保 lint 与 format 可通过。

## 目录约定
- `src/`：业务代码。
- `dist/`：构建产物（由 `tsc` 生成）。
- 不要手动编辑 `dist/`。

## 运行限制
- 默认在仓库根目录执行命令。
- Windows 路径使用反斜杠，但命令内仍可使用正斜杠。
- 不要假设全局安装工具，使用 `bun run`。
- 不要在脚本中写死绝对路径。
- 需要新脚本请先讨论。

## 代理执行提示
- 优先使用仓库脚本而非裸命令。
- 修改文件前先阅读相关文件与上下文。
- 修改后保持改动最小且可解释。
- 不要引入与需求无关的重构。

## 备注
- 如后续新增 Cursor/Copilot 规则文件，请补充本节。
- 本文件面向自动化代理，请保持更新。
