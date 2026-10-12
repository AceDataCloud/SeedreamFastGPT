# Ace Data Cloud Seedream for FastGPT

Generate image and retrieve the result in a FastGPT workflow. [简体中文](README_zh_CN.md) · [Current pricing](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=seedreamfastgpt_readme_pricing)

## Quick start

### 1. Install

Use FastGPT 4.15 or later. Once published, search FastGPT Marketplace for **Ace Data Cloud Seedream** and verify the author is **Ace Data Cloud**. Before listing, a business or self-hosted administrator can build and upload this repository's .pkg. FastGPT Cloud does not currently allow direct custom plugin uploads.

### 2. Get an API key

Sign in to [Ace Data Cloud → Applications](https://platform.acedata.cloud/console/applications?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=seedreamfastgpt_readme_api_key), open **General Application**, and confirm **Seedream** access, balance, and current price. Copy the key using icon **1** below; or select **2 Manage Keys → Create** for a separate FastGPT key. If **Allowed APIs** is enabled, include both /seedream/images and /seedream/tasks. In the FastGPT plugin configuration, paste only the key into **Ace Data Cloud API key**, without Bearer or quotes.

![Actual Ace Data Cloud application screen with the key redacted](assets/get-api-key-en.png)

### 3. Build the first workflow

In **Studio → Create Agent → Workflow**, start with **Process starts**. From **System Tools**, add **Ace Data Cloud Seedream / Generate image** and **Retrieve task**. Activate both tools with the configured **System secret**. Connect **Process starts → Generate image → Retrieve task → Basic / Assigned Reply**. Enter:

| Generate field | First-run value |
|---|---|
| Model | doubao-seedream-5-0-lite-260128 |
| Size | 2K |
| Watermark | false |

**Prompt**: A single blue paper sphere on a cream background, studio product photograph, no text.

For **Retrieve task → Task ID**, choose **Variable Reference → Generate image → Task ID**. In **Assigned Reply**, insert the Retrieve task outputs (status, success, taskId, mediaUrls, and costCredits) with the variable picker. Choose **Save Only**, then **Run Preview** once. If status is pending, save taskId. To check later, create a separate **Process starts → Retrieve task → Basic / Assigned Reply** workflow and enter that same ID. Running the generation workflow again submits and bills another generation.

When status is succeeded and success is true, open a link from mediaUrls. Match the task ID and reported Credits with Ace Data Cloud request history; pricing and your package exchange rate may change.

The FastGPT screenshots below show installation and a **read-only query of a previously generated task**. They do not show a new FastGPT generation.

![Installed plugin with Normal status and Configured system key](assets/fastgpt-installed-configured.png)

![FastGPT workflow querying a previously generated task](assets/fastgpt-lookup-workflow.png)

![Previously generated media returned in FastGPT Run Preview](assets/fastgpt-lookup-result.png)

For edits, **Edit image** accepts one authorized HTTPS reference image URL. It returns a task ID; connect that ID to the same **Retrieve task** tool. Editing is a separate billable submission.

For several existing tasks, **Retrieve tasks** accepts 1–20 Task IDs and queries them in one read-only call. Check each item’s status; a batch is complete only when all items succeed. This does not submit new generation.

A batch stays pending if a requested task is missing or a returned task ID cannot be matched. Verify the existing IDs; do not submit generation again.

### 4. Copyable no-key example

[examples/generate.json](examples/generate.json) contains no credentials. Create a local .secrets.local.json containing {"apiKey":"YOUR_OWN_KEY"}, then:

~~~sh
pnpm install
pnpm exec fastgpt-plugin debug . --run --tool generate --input-file examples/generate.json --secrets-file .secrets.local.json
pnpm exec fastgpt-plugin build --entry . --output ./dist
pnpm exec fastgpt-plugin check --entry . --output ./dist
pnpm exec fastgpt-plugin pack --entry . --dist ./dist --output ./out
~~~

For a pending result, create a local examples/retrieve.local.json with {"taskId":"THE_RETURNED_TASK_ID"}. Use the same secret file and run only:

~~~sh
pnpm exec fastgpt-plugin debug . --run --tool retrieveTask --input-file examples/retrieve.local.json --secrets-file .secrets.local.json
~~~

Local secret files are ignored by Git. Do not publish them.

| What you see | What to do |
|---|---|
| 401 / 403 | Check key, expiration, Seedream access, Allowed APIs, and balance. |
| 400 | Start with the exact first-run fields and inspect the rejected parameter. |
| pending / no media | Query only the same task ID later. |
| 429 | Wait and lower concurrency; never enable automatic paid generation retries. |
| timeout / 5xx / failed | Inspect the original task and request history before resubmitting. Give support the task or trace ID, never your key. |

The plugin sends the selected inputs and token to api.acedata.cloud. Calls follow [current pricing](https://platform.acedata.cloud/models?utm_source=opensource&utm_medium=referral&utm_campaign=evergreen&utm_content=seedreamfastgpt_readme_pricing). [Privacy](PRIVACY.md) · [Source and support](https://github.com/AceDataCloud/SeedreamFastGPT/issues).
