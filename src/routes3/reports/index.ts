import routerx from 'express-promise-router';
import { reportProfit, reportProfitByRole } from '../../controllers/reports/index';
const router = routerx();

router.post('/report-profit', reportProfit);
router.post('/report-profit-by-role', reportProfitByRole);

export default router;