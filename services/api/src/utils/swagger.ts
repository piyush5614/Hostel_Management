/**
 * Swagger/OpenAPI 3.0 Configuration
 * Generates interactive API documentation at GET /api-docs
 */

export const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'TC Hostel Connect API',
      description: 'REST API for hostel management system with multi-college support',
      version: '1.0.0',
      contact: {
        name: 'TC Hostel Connect Support',
        url: 'https://github.com',
      },
      license: {
        name: 'MIT',
      },
    },
    servers: [
      {
        url: 'http://localhost:3001',
        description: 'Development server',
      },
      {
        url: 'https://api.hostel.edu',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/auth/login',
        },
      },
      schemas: {
        User: {
          type: 'object',
          required: ['id', 'email', 'name', 'role', 'college_id'],
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440000',
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'student@tchostel.edu',
            },
            name: {
              type: 'string',
              example: 'John Doe',
            },
            role: {
              type: 'string',
              enum: ['admin', 'warden', 'staff', 'student'],
              example: 'student',
            },
            college_id: {
              type: 'string',
              example: 'college-001',
            },
            profile_image: {
              type: 'string',
              format: 'uri',
              nullable: true,
            },
            generated_id: {
              type: 'string',
              nullable: true,
              example: 'STU-0001',
            },
            is_active: {
              type: 'boolean',
              example: true,
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            last_login: {
              type: 'string',
              format: 'date-time',
              nullable: true,
            },
          },
        },
        Student: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            user_id: {
              type: 'string',
              format: 'uuid',
            },
            enrollment_number: {
              type: 'string',
              example: 'ENR-2024-001',
            },
            course: {
              type: 'string',
              example: 'B.Tech Computer Science',
            },
            year: {
              type: 'integer',
              minimum: 1,
              maximum: 4,
            },
            room_id: {
              type: 'string',
              nullable: true,
            },
            current_status: {
              type: 'string',
              enum: ['present', 'absent', 'leave', 'on-campus'],
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              example: 'Invalid credentials',
            },
            code: {
              type: 'string',
              example: 'INVALID_AUTH',
            },
            statusCode: {
              type: 'integer',
              example: 401,
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: [
    './src/routes/auth.ts',
    './src/routes/students.ts',
    './src/routes/rooms.ts',
    './src/routes/attendance.ts',
    './src/routes/leave.ts',
    './src/routes/maintenance.ts',
    './src/routes/staff.ts',
    './src/routes/visitors.ts',
    './src/routes/messages.ts',
    './src/routes/reports.ts',
    './src/routes/applications.ts',
  ],
};

/**
 * API Endpoint Documentation
 * Add JSDoc comments to route files like:
 * 
 * /**
 *  * @swagger
 *  * /api/auth/login:
 *  *   post:
 *  *     summary: User login
 *  *     tags: [Authentication]
 *  *     requestBody:
 *  *       required: true
 *  *       content:
 *  *         application/json:
 *  *           schema:
 *  *             type: object
 *  *             required: [email, password]
 *  *             properties:
 *  *               email:
 *  *                 type: string
 *  *               password:
 *  *                 type: string
 *  *     responses:
 *  *       200:
 *  *         description: Login successful
 *  *         content:
 *  *           application/json:
 *  *             schema:
 *  *               type: object
 *  *               properties:
 *  *                 user:
 *  *                   $ref: '#/components/schemas/User'
 *  *                 token:
 *  *                   type: string
 *  *       401:
 *  *         description: Invalid credentials
 *  *         content:
 *  *           application/json:
 *  *             schema:
 *  *               $ref: '#/components/schemas/ErrorResponse'
 *  * /
 */
