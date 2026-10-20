import { getDatabase } from '@netlify/database';
import { create_task_handler } from '../../web/server/task-api.mjs';

// Custom paths expose the same handler at both collection and individual-task URLs.
let database;
export default create_task_handler(() => database ??= getDatabase());
export const config = { path: ['/api/tasks', '/api/tasks/:id'] };
