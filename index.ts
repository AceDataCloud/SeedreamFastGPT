import {
  createToolHandler,
  defineToolSet,
  type InputSchemaMetaType,
  type OutputSchemaMetaType,
  type SecretSchemaMetaType
} from '@fastgpt-plugin/sdk-factory';
import z from 'zod';

import { submitEdit, submitGeneration, retrieveTask } from './src/client.ts';

const secretSchema = z.object({
  apiKey: z.string().min(1).meta({
    title: 'Ace Data Cloud API key',
    description: 'Create an application API key at platform.acedata.cloud. Do not include Bearer.',
    isSecret: true
  } satisfies SecretSchemaMetaType)
});

const outputSchema = z.object({
  taskId: z.string().meta({ title: 'Task ID' } satisfies OutputSchemaMetaType),
  traceId: z.string().meta({ title: 'Trace ID' } satisfies OutputSchemaMetaType),
  status: z.enum(['pending', 'succeeded', 'failed']).meta({ title: 'Task status' } satisfies OutputSchemaMetaType),
  success: z.boolean().meta({ title: 'Succeeded' } satisfies OutputSchemaMetaType),
  mediaUrls: z.array(z.string()).meta({ title: 'Media URLs' } satisfies OutputSchemaMetaType),
  costCredits: z.number().nullable().meta({ title: 'Reported Credits' } satisfies OutputSchemaMetaType)
});

const generateHandler = createToolHandler({
  inputSchema: z.object({
    prompt: z.string().trim().min(1).max(10000).meta({ title: 'Prompt', isToolParam: true } satisfies InputSchemaMetaType),
    model: z.string().trim().min(1).max(256).default('doubao-seedream-5-0-lite-260128').meta({ title: 'Model' } satisfies InputSchemaMetaType),
    size: z.string().trim().min(1).max(256).default('2K').meta({ title: 'Size' } satisfies InputSchemaMetaType),
    watermark: z.boolean().default(false).meta({ title: 'Watermark' } satisfies InputSchemaMetaType),
  }),
  outputSchema,
  secretSchema,
  handler: async (input, ctx) => submitGeneration(input, ctx.secrets?.apiKey ?? '')
});

const editHandler = createToolHandler({
  inputSchema: z.object({
    prompt: z.string().trim().min(1).max(10000).meta({ title: 'Edit prompt', isToolParam: true } satisfies InputSchemaMetaType),
    imageUrl: z.string().url().startsWith('https://').meta({ title: 'Reference image URL' } satisfies InputSchemaMetaType),
    model: z.string().trim().min(1).max(256).default('doubao-seedream-5-0-lite-260128').meta({ title: 'Model' } satisfies InputSchemaMetaType),
    size: z.string().trim().min(1).max(256).default('2K').meta({ title: 'Size' } satisfies InputSchemaMetaType),
    watermark: z.boolean().default(false).meta({ title: 'Watermark' } satisfies InputSchemaMetaType),
  }),
  outputSchema,
  secretSchema,
  handler: async (input, ctx) => submitEdit(input, ctx.secrets?.apiKey ?? '')
});

const retrieveHandler = createToolHandler({
  inputSchema: z.object({
    taskId: z.string().trim().min(1).meta({
      title: 'Task ID',
      description: 'Bind to Generate → Task ID. Querying this ID does not generate again.',
      isToolParam: true
    } satisfies InputSchemaMetaType)
  }),
  outputSchema,
  secretSchema,
  handler: async (input, ctx) => retrieveTask(input.taskId, ctx.secrets?.apiKey ?? '')
});

export default defineToolSet({
  manifest: {
    pluginId: 'acedataSeedream',
    version: '0.2.0',
    name: { en: 'Ace Data Cloud Seedream', 'zh-CN': 'Ace Data Cloud Seedream 图像' },
    description: {
      en: 'Generate image with Seedream through Ace Data Cloud and retrieve the same task.',
      'zh-CN': '通过 Ace Data Cloud Seedream 图像生成并查询同一任务。'
    },
    versionDescription: { en: 'Align API limits, task status and edit actions', 'zh-CN': '对齐 API 限制和任务状态处理' },
    author: 'Ace Data Cloud',
    repoUrl: 'https://github.com/AceDataCloud/SeedreamFastGPT',
    tutorialUrl: 'https://github.com/AceDataCloud/SeedreamFastGPT#quick-start',
    tags: ['multimodal'],
    permission: []
  },
  secretSchema,
  children: [
    {
      id: 'generate',
      name: { en: 'Generate image', 'zh-CN': '生成Seedream 图像' },
      description: { en: 'Submit one Seedream generation and return its task ID.', 'zh-CN': '提交一次Seedream 图像生成并返回任务 ID。' },
      toolDescription: 'Submit once. Do not call again to check a pending task.',
      handler: generateHandler
    },
    {
      id: 'editImage',
      name: { en: 'Edit image', 'zh-CN': '编辑图像' },
      description: { en: 'Edit one authorized image and return its task ID.', 'zh-CN': '编辑一张经授权的图片并返回任务 ID。' },
      toolDescription: 'Submit one edit. Use Retrieve task to check its ID without editing again.',
      handler: editHandler
    },
    {
      id: 'retrieveTask',
      name: { en: 'Retrieve task', 'zh-CN': '查询任务' },
      description: { en: 'Read the status and result of an existing Seedream task.', 'zh-CN': '读取已有Seedream 图像任务的状态和结果。' },
      toolDescription: 'Read an existing task by ID without submitting a new generation.',
      handler: retrieveHandler
    }
  ]
});
