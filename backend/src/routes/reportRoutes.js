import { Router } from 'express';
import { summary } from '../controllers/reportController.js';
const router = Router();
router.get('/summary', (req, res, next) => summary(req, res).catch(next));
export default router;
