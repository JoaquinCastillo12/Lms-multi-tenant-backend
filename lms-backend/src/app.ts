import { Hono } from 'hono';
import { cors } from 'hono/cors';
import auth from './routes/auth';
import courses from './routes/courses';
import lessons from './routes/lessons';
import materials from './routes/materials';
import users from './routes/users';
import { Env } from './types';
import { createUser } from './utils/hash';

const app = new Hono<{ Bindings: Env }>();

// CORS configuration
// localhost:5173  frontend de prueba
//https://lms-backend.pruebatecnica.workers.dev/ deploy

app.use('*', cors({
  origin: ['http://localhost:3000', 'https://lms-backend.pruebatecnica.workers.dev/','http://localhost:5173'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  credentials: true,
}));

// Health check endpoint
app.get('/', (c) => {
  return c.json({ 
    message: 'LMS Backend API', 
    version: '1.0.0',
    status: 'healthy'
  });
});

//Endpoint para crear primer user
app.post('/create-user', createUser)
// Mount routes
app.route('/auth', auth);
app.route('/courses', courses);
app.route('/lessons', lessons);
app.route('/materials', materials);
app.route('/users', users);

// 404 handler
app.notFound((c) => {
  return c.json({ success: false, error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({ success: false, error: 'Internal Server Error' }, 500);
});

export default app;
