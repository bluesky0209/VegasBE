import routerx from 'express-promise-router';
import lists from './lists';
import providers from './providers';
import history from './history';
import { verifyAdminToken } from '../../middlewares/auth';
const router = routerx();

router.use('/history', verifyAdminToken, history);
router.use('/lists', verifyAdminToken, lists);
router.use('/providers', verifyAdminToken, providers);

export default router;
