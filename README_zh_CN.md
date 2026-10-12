# Ace Data Cloud Seedream 图像 for FastGPT

[English guide](README.md) · [当前价格](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=seedreamfastgpt_readme_pricing)

本插件把生成操作与单项／批量任务查询分开。生成只提交一次；之后只查询原 taskId。返回 pending 或工作流显示成功，都不代表媒体文件已完成。

## 从零开始

1. 使用 FastGPT 4.15 或更新版本。上架后在插件市场搜索 **Ace Data Cloud Seedream**，核对作者是 **Ace Data Cloud**。上架前，企业版或自部署管理员可构建并上传本仓库的 .pkg；FastGPT 云服务目前不支持用户直接上传自定义插件。
2. 登录 [Ace Data Cloud 应用管理](https://platform.acedata.cloud/console/applications?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=seedreamfastgpt_readme_api_key)，打开 **General Application**，确认 Seedream 权限、余额和当期价格。点击下图 **1** 复制密钥，或选择 **2 Manage Keys → Create** 新建 FastGPT 专用密钥。若开启 Allowed APIs，同时允许 /seedream/images and /seedream/tasks。在 FastGPT 插件配置的 **Ace Data Cloud API key** 只填令牌本身，不加 Bearer 或引号。

![Ace Data Cloud 的真实应用密钥界面，密钥已遮挡](assets/get-api-key-en.png)

3. 在 **Studio → Create Agent → Workflow** 新建工作流。从 **System Tools** 添加 **Ace Data Cloud Seedream / Generate image** 和 **Retrieve task**，激活两个工具并选择已配置的 **System secret**。连接 **Process starts → Generate image → Retrieve task → Basic / Assigned Reply**。生成工具按下表填写，其余留空：

| 字段 | 首次运行值 |
|---|---|
| Model | doubao-seedream-5-0-lite-260128 |
| Size | 2K |
| Watermark | false |

**Prompt**：A single blue paper sphere on a cream background, studio product photograph, no text.

4. 查询工具的 **Task ID** 选择 **Variable Reference → Generate image → Task ID**。在 **Assigned Reply** 中用变量选择器插入查询工具的 status、success、taskId、mediaUrls 和 costCredits。选择 **Save Only**，再用 **Run Preview** 执行一次。若结果为 pending，保存 taskId；之后新建 **Process starts → Retrieve task → Basic / Assigned Reply** 工作流，只填同一个 Task ID 查询。重跑生成工作流会再次提交并计费。
5. status=succeeded 且 success=true 后打开 mediaUrls。用 taskId 在 Ace Data Cloud 请求记录核对调用与 Credits；实际套餐换算与价格以当期为准。

以下 FastGPT 截图展示插件安装，以及**通过 FastGPT 只读查询此前已生成的任务**；并非新发起的 FastGPT 生成。

![FastGPT 插件状态 Normal，系统密钥已配置](assets/fastgpt-installed-configured.png)

![FastGPT 查询此前生成任务的工作流](assets/fastgpt-lookup-workflow.png)

![FastGPT Run Preview 返回此前生成的媒体](assets/fastgpt-lookup-result.png)

编辑时选择 **Edit image**，填入一张经授权且可访问的 HTTPS 参考图片 URL。编辑会单独提交并可能计费；把返回的 Task ID 接到同一个 **Retrieve task** 查询工具。

多个已有任务可用 **Retrieve tasks** 输入 1–20 个 Task ID，一次只读查询。逐项检查状态；只有全部成功时批次才算成功。此工具不会提交新生成。

如果有请求的任务未返回，或返回的任务 ID 无法对应，批量结果会保持待完成。请核对已有任务 ID，不要重新提交生成。

## 无密钥示例

[examples/generate.json](examples/generate.json) 不含密钥。把真实密钥写入本地 .secrets.local.json，内容为 {"apiKey":"YOUR_OWN_KEY"}，然后运行：

~~~sh
pnpm install
pnpm exec fastgpt-plugin debug . --run --tool generate --input-file examples/generate.json --secrets-file .secrets.local.json
pnpm exec fastgpt-plugin build --entry . --output ./dist
pnpm exec fastgpt-plugin check --entry . --output ./dist
pnpm exec fastgpt-plugin pack --entry . --dist ./dist --output ./out
~~~

若 pending，另建本地 examples/retrieve.local.json，内容为 {"taskId":"返回的任务 ID"}；只运行：

~~~sh
pnpm exec fastgpt-plugin debug . --run --tool retrieveTask --input-file examples/retrieve.local.json --secrets-file .secrets.local.json
~~~

本地密钥文件已由 Git 忽略。401/403 检查密钥、权限与余额；400 核对参数；429 降低并发；超时、5xx 或任务失败先查原任务和请求记录，不要自动重试付费生成。客服只需 taskId 或 traceId，不需要密钥。

插件只向 api.acedata.cloud 发送所选输入和令牌。[隐私说明](PRIVACY.md) · [源码与问题反馈](https://github.com/AceDataCloud/SeedreamFastGPT/issues)。
