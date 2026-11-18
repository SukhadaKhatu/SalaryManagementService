import { getSummary } from '../services/reportService.js';
export async function summary(req, res) { res.json(await getSummary()); }
