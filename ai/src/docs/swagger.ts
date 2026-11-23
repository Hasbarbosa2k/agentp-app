import { loadConfig } from '../config';

export function buildOpenApiSpec() {
  const port = loadConfig().PORT;
  const servers = [
    { url: `http://localhost:${port}` },
  ];
  return {
    openapi: '3.0.3',
    info: {
      title: 'AI API',
      version: '0.1.0',
      description: 'LLM-agnostic API with per-system RAG and Prometheus YAML generation',
    },
    servers,
    paths: {
      '/api/chat': {
        post: {
          summary: 'LLM chat (provider-agnostic)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    messages: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          role: { type: 'string', enum: ['system', 'user', 'assistant'] },
                          content: { type: 'string' },
                        },
                        required: ['role', 'content'],
                      },
                    },
                    options: { type: 'object' },
                  },
                  required: ['messages'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
              content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' } } } } },
            },
          },
        },
      },
      '/api/issue-solver': {
        post: {
          summary: 'Diagnose and suggest fixes using RAG scoped by system',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { system: { type: 'string' }, issue: { type: 'string' }, topK: { type: 'integer' }, options: { type: 'object' } }, required: ['system', 'issue'] } } },
          },
          responses: {
            200: {
              description: 'OK',
              content: { 'application/json': { schema: { type: 'object', properties: { text: { type: 'string' }, references: { type: 'array', items: { type: 'object', properties: { idx: { type: 'integer' }, path: { type: 'string' }, score: { type: 'number' } } } } } } } },
            },
          },
        },
      },
      '/api/prometheus/generate': {
        post: {
          summary: 'Generate Prometheus alerting rules YAML',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { type: 'object', properties: { system: { type: 'string' }, description: { type: 'string' }, severity: { type: 'string' }, options: { type: 'object' } }, required: ['system', 'description'] } } },
          },
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { yaml: { type: 'string' }, parsed: { type: 'object' }, references: { type: 'array', items: { type: 'object', properties: { idx: { type: 'integer' }, path: { type: 'string' } } } } } } } } },
          },
        },
      },
      '/api/rag/ingest': {
        post: {
          summary: 'Ingest knowledge base (per system or all)',
          requestBody: { required: false, content: { 'application/json': { schema: { type: 'object', properties: { system: { type: 'string' }, fullReindex: { type: 'boolean' }, patterns: { type: 'array', items: { type: 'string' } }, dryRun: { type: 'boolean', description: 'List files only, do not ingest' } } } } } },
          responses: { 200: { description: 'OK' } },
        },
      },
      '/api/rag/upload': {
        post: {
          summary: 'Upload files to the knowledge base for a system and ingest',
          requestBody: {
            required: true,
            content: {
              'multipart/form-data': {
                schema: {
                  type: 'object',
                  properties: {
                    system: { type: 'string', description: 'System subdirectory name' },
                    files: { type: 'array', items: { type: 'string', format: 'binary' } },
                  },
                  required: ['system', 'files'],
                },
              },
            },
          },
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { saved: { type: 'array', items: { type: 'string' } }, ingested: { type: 'array', items: { type: 'string' } } } } } } },
          },
        },
      },
      '/api/rag/search': {
        get: {
          summary: 'Preview RAG search results by system',
          parameters: [
            { name: 'system', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'q', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'k', in: 'query', required: false, schema: { type: 'integer', default: 8 } },
          ],
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { hits: { type: 'array', items: { type: 'object', properties: { content: { type: 'string' }, path: { type: 'string' }, score: { type: 'number' } } } } } } } } },
          },
        },
      },
      '/api/rag/stats': {
        get: {
          summary: 'RAG ingestion stats per system',
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { total: { type: 'integer' }, perSystem: { type: 'object', additionalProperties: { type: 'integer' } }, systems: { type: 'array', items: { type: 'string' } } } } } } },
          },
        },
      },
      '/api/system/summary': {
        post: {
          summary: 'Summarize raw system command outputs (top, systemctl, netstat, os-release)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    sudo: { type: 'string', description: 'Optional marker (ignored by server)' },
                    top: { type: 'string', description: 'Output of: top -b -n1 | head -n 20' },
                    systemctl: { type: 'string', description: 'Output of: systemctl --type=service --state=active --no-pager --no-legend' },
                    netstat: { type: 'string', description: 'Output of: sudo netstat -plnt' },
                    osRelease: { type: 'string', description: 'Output of: cat /etc/os-release' },
                  },
                  required: ['top', 'netstat', 'osRelease'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      summary: {
                        type: 'object',
                        properties: {
                          topProcesses: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, cpuPercent: { type: 'number' } } } },
                          activeServices: { type: 'array', items: { type: 'object', properties: { name: { type: 'string' }, state: { type: 'string' } } } },
                          openPorts: { type: 'array', items: { type: 'object', properties: { port: { type: 'integer' }, label: { type: 'string' }, proto: { type: 'string' }, process: { type: 'string' } } } },
                          systemInfo: { type: 'object', properties: { kernel: { type: 'string' }, arch: { type: 'string' }, loadAvg: { type: 'array', items: { type: 'number' } }, users: { type: 'integer' }, osName: { type: 'string' }, osVersion: { type: 'string' } } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/ui/test-plan': {
        post: {
          summary: 'Generate a detailed UI test plan from instruction (retrieves RAG context internally)',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    instruction: { type: 'string' },
                    system: { type: 'string' },
                    options: { type: 'object' },
                  },
                  required: ['instruction', 'system'],
                },
              },
            },
          },
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: { type: 'object', properties: { text: { type: 'string' }, parsed: { type: 'object' } } },
                },
              },
            },
          },
        },
      },
    },
    components: {},
  } as const;
}