import { Router } from 'express';
import * as controller from '../controllers/employeeController.js';
const router = Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
router.get('/', wrap(controller.list));
router.get('/:id', wrap(controller.get));
router.get('/:id/salary-history', wrap(controller.history));
router.patch('/:id/salary', wrap(controller.update));
export default router;
