const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Autenticação Node.js',
      version: '1.0.0',
      description: 'API robusta de autenticação com JWT, construída com Node.js e Express',
      contact: {
        name: 'API Support',
        email: 'support@exemplo.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Servidor de Desenvolvimento'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Insere o access token JWT no formato: Bearer {token}'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID único do utilizador'
            },
            username: {
              type: 'string',
              description: 'Nome de utilizador único',
              minLength: 3,
              maxLength: 30
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Endereço de email único'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'Role do utilizador'
            },
            isActive: {
              type: 'boolean',
              description: 'Se a conta está ativa'
            },
            isBlocked: {
              type: 'boolean',
              description: 'Se a conta está bloqueada'
            },
            blockedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data do bloqueio'
            },
            blockReason: {
              type: 'string',
              description: 'Motivo do bloqueio'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação da conta'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data da última atualização'
            }
          }
        },
        Tokens: {
          type: 'object',
          properties: {
            accessToken: {
              type: 'string',
              description: 'Token de acesso JWT (válido por 15 minutos)'
            },
            refreshToken: {
              type: 'string',
              description: 'Token de renovação JWT (válido por 30 dias)'
            }
          }
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'email', 'password'],
          properties: {
            username: {
              type: 'string',
              minLength: 3,
              maxLength: 30,
              pattern: '^[a-zA-Z0-9_]+$',
              description: 'Nome de utilizador (3-30 chars, apenas letras, números e _)',
              example: 'joao123'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Endereço de email válido',
              example: 'joao@exemplo.com'
            },
            password: {
              type: 'string',
              minLength: 6,
              pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)',
              description: 'Password (min 6 chars, 1 minúscula + 1 MAIÚSCULA + 1 número)',
              example: 'MinhaPass123'
            }
          }
        },
        LoginRequest: {
          type: 'object',
          required: ['identifier', 'password'],
          properties: {
            identifier: {
              type: 'string',
              description: 'Email ou username do utilizador',
              example: 'joao@exemplo.com'
            },
            password: {
              type: 'string',
              description: 'Password do utilizador',
              example: 'MinhaPass123'
            }
          }
        },
        ChangePasswordRequest: {
          type: 'object',
          required: ['currentPassword', 'newPassword'],
          properties: {
            currentPassword: {
              type: 'string',
              description: 'Password atual',
              example: 'MinhaPass123'
            },
            newPassword: {
              type: 'string',
              minLength: 6,
              pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)',
              description: 'Nova password (min 6 chars, 1 minúscula + 1 MAIÚSCULA + 1 número)',
              example: 'NovaPassword456'
            }
          }
        },
        RefreshTokenRequest: {
          type: 'object',
          required: ['refreshToken'],
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Refresh token obtido no login/registo',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          }
        },
        LogoutRequest: {
          type: 'object',
          properties: {
            refreshToken: {
              type: 'string',
              description: 'Refresh token a invalidar (opcional)',
              example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
            }
          }
        },
        PasswordResetRequest: {
          type: 'object',
          required: ['email'],
          properties: {
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do utilizador para reset',
              example: 'joao@exemplo.com'
            }
          }
        },
        ResetPasswordRequest: {
          type: 'object',
          required: ['token', 'newPassword'],
          properties: {
            token: {
              type: 'string',
              description: 'Token de reset enviado por email',
              example: 'a1b2c3d4e5f6...'
            },
            newPassword: {
              type: 'string',
              minLength: 6,
              pattern: '^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)',
              description: 'Nova password',
              example: 'NovaPassword123'
            }
          }
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Operação realizada com sucesso'
            },
            data: {
              type: 'object',
              description: 'Dados da resposta (varia por endpoint)'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            message: {
              type: 'string',
              example: 'Descrição do erro'
            },
            error: {
              type: 'string',
              description: 'Detalhes técnicos do erro (apenas em desenvolvimento)'
            }
          }
        },
        BlockUserRequest: {
          type: 'object',
          properties: {
            reason: {
              type: 'string',
              minLength: 3,
              maxLength: 500,
              description: 'Motivo do bloqueio (opcional)',
              example: 'Violação dos termos de serviço'
            }
          }
        },
        ChangeRoleRequest: {
          type: 'object',
          required: ['role'],
          properties: {
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'Novo role para o utilizador',
              example: 'admin'
            },
            reason: {
              type: 'string',
              minLength: 3,
              maxLength: 500,
              description: 'Motivo da alteração (opcional)',
              example: 'Promoção por bom desempenho'
            }
          }
        },
        UserStatsResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            message: {
              type: 'string',
              example: 'Estatísticas obtidas com sucesso'
            },
            data: {
              type: 'object',
              properties: {
                totalUsers: {
                  type: 'integer',
                  description: 'Total de utilizadores registados'
                },
                activeUsers: {
                  type: 'integer',
                  description: 'Utilizadores ativos e não bloqueados'
                },
                blockedUsers: {
                  type: 'integer',
                  description: 'Utilizadores bloqueados'
                },
                adminUsers: {
                  type: 'integer',
                  description: 'Número de administradores'
                },
                inactiveUsers: {
                  type: 'integer',
                  description: 'Utilizadores inativos'
                },
                newUsersLastMonth: {
                  type: 'integer',
                  description: 'Novos utilizadores nos últimos 30 dias'
                },
                userGrowthRate: {
                  type: 'string',
                  description: 'Taxa de crescimento percentual',
                  example: '15.5%'
                }
              }
            }
          }
        },
        System: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'ID único do sistema'
            },
            name: {
              type: 'string',
              description: 'Nome do sistema',
              example: 'Production Web Server'
            },
            ip: {
              type: 'string',
              description: 'Endereço IP do sistema',
              example: '192.168.1.100'
            },
            status: {
              type: 'string',
              enum: ['online', 'offline', 'maintenance', 'unknown'],
              description: 'Status atual do sistema'
            },
            statusDisplay: {
              type: 'string',
              description: 'Status com emoji',
              example: 'Online'
            },
            os: {
              type: 'string',
              description: 'Sistema operativo',
              example: 'Ubuntu 22.04'
            },
            owner: {
              type: 'string',
              description: 'Responsável pelo sistema',
              example: 'DevOps Team'
            },
            description: {
              type: 'string',
              description: 'Descrição do sistema',
              example: 'Servidor web principal de produção'
            },
            environment: {
              type: 'string',
              enum: ['production', 'staging', 'development', 'testing'],
              description: 'Ambiente do sistema'
            },
            environmentDisplay: {
              type: 'string',
              description: 'Ambiente com emoji',
              example: 'Production'
            },
            uptime: {
              type: 'string',
              description: 'Tempo de atividade',
              example: '45 days'
            },
            lastTest: {
              type: 'string',
              format: 'date-time',
              description: 'Data do último teste'
            },
            lastTestStatus: {
              type: 'string',
              enum: ['success', 'failed', 'pending'],
              description: 'Status do último teste'
            },
            port: {
              type: 'integer',
              description: 'Porta principal',
              example: 80
            },
            protocol: {
              type: 'string',
              enum: ['http', 'https', 'ssh', 'ftp', 'other'],
              description: 'Protocolo principal'
            },
            tags: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Tags para categorização'
            },
            monitoringEnabled: {
              type: 'boolean',
              description: 'Se monitorização está ativa'
            },
            alertsEnabled: {
              type: 'boolean',
              description: 'Se alertas estão ativos'
            },
            createdBy: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string' }
              },
              description: 'Utilizador que criou o sistema'
            },
            updatedBy: {
              type: 'object',
              properties: {
                _id: { type: 'string' },
                username: { type: 'string' },
                email: { type: 'string' }
              },
              description: 'Utilizador que atualizou o sistema'
            },
            isActive: {
              type: 'boolean',
              description: 'Se o sistema está ativo'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data da última atualização'
            }
          }
        },
        Pagination: {
          type: 'object',
          properties: {
            currentPage: {
              type: 'integer',
              description: 'Página atual'
            },
            totalPages: {
              type: 'integer',
              description: 'Total de páginas'
            },
            totalSystems: {
              type: 'integer',
              description: 'Total de sistemas'
            },
            hasNext: {
              type: 'boolean',
              description: 'Se há próxima página'
            },
            hasPrev: {
              type: 'boolean',
              description: 'Se há página anterior'
            }
          }
        },
        Profile: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              description: 'ID único do utilizador'
            },
            username: {
              type: 'string',
              description: 'Nome de utilizador'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'Email do utilizador'
            },
            displayName: {
              type: 'string',
              description: 'Nome de exibição do utilizador'
            },
            team: {
              type: 'string',
              description: 'Team do utilizador'
            },
            role: {
              type: 'string',
              enum: ['user', 'admin'],
              description: 'Role do utilizador'
            },
            lastLoginAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data do último login'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data de criação'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Data da última atualização'
            }
          }
        },
        UserPreferences: {
          type: 'object',
          properties: {
            notifications: {
              type: 'object',
              properties: {
                testCompletion: {
                  type: 'boolean',
                  description: 'Notificações de conclusão de testes'
                },
                systemAlerts: {
                  type: 'boolean',
                  description: 'Alertas do sistema'
                },
                emailReports: {
                  type: 'boolean',
                  description: 'Relatórios por email'
                }
              }
            },
            appearance: {
              type: 'object',
              properties: {
                theme: {
                  type: 'string',
                  enum: ['light', 'dark', 'auto'],
                  description: 'Tema da interface'
                },
                accentColor: {
                  type: 'string',
                  pattern: '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$',
                  description: 'Cor de destaque'
                }
              }
            },
            advanced: {
              type: 'object',
              properties: {
                debugMode: {
                  type: 'boolean',
                  description: 'Modo de depuração'
                },
                detailedLogs: {
                  type: 'boolean',
                  description: 'Logs detalhados'
                }
              }
            }
          }
        },
        SystemSettings: {
          type: 'object',
          properties: {
            database: {
              type: 'object',
              properties: {
                backupFrequency: {
                  type: 'string',
                  enum: ['hourly', 'daily', 'weekly', 'monthly'],
                  description: 'Frequência de backup'
                },
                autoCleanupOldTests: {
                  type: 'boolean',
                  description: 'Limpeza automática de testes antigos'
                },
                retentionPeriodDays: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 365,
                  description: 'Período de retenção em dias'
                }
              }
            },
            security: {
              type: 'object',
              properties: {
                sessionTimeoutMinutes: {
                  type: 'integer',
                  minimum: 5,
                  maximum: 10080,
                  description: 'Timeout de sessão em minutos'
                },
                maxLoginAttempts: {
                  type: 'integer',
                  minimum: 3,
                  maximum: 10,
                  description: 'Máximo de tentativas de login'
                },
                lockoutDurationMinutes: {
                  type: 'integer',
                  minimum: 5,
                  maximum: 1440,
                  description: 'Duração do bloqueio em minutos'
                }
              }
            },
            system: {
              type: 'object',
              properties: {
                maintenanceMode: {
                  type: 'boolean',
                  description: 'Modo de manutenção ativo'
                },
                maintenanceMessage: {
                  type: 'string',
                  description: 'Mensagem de manutenção'
                },
                maxUsersAllowed: {
                  type: 'integer',
                  description: 'Máximo de utilizadores permitidos'
                },
                allowUserRegistration: {
                  type: 'boolean',
                  description: 'Permitir registo de novos utilizadores'
                }
              }
            },
            monitoring: {
              type: 'object',
              properties: {
                enabled: {
                  type: 'boolean',
                  description: 'Monitorização ativa'
                },
                logLevel: {
                  type: 'string',
                  enum: ['error', 'warn', 'info', 'debug'],
                  description: 'Nível de logs'
                },
                checkIntervalMinutes: {
                  type: 'integer',
                  description: 'Intervalo de verificação em minutos'
                },
                retainLogsDays: {
                  type: 'integer',
                  description: 'Dias de retenção de logs'
                }
              }
            },
            version: {
              type: 'string',
              description: 'Versão das configurações'
            },
            lastUpdated: {
              type: 'string',
              format: 'date-time',
              description: 'Data da última atualização'
            }
          }
        }
      }
    }
  },
  apis: ['./routes/*.js', './server.js'] // Caminhos para ficheiros com documentação JSDoc
};

const specs = swaggerJSDoc(options);
module.exports = specs; 