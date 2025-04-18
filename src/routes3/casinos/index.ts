import routerx from 'express-promise-router';
import casinos from './casinos';
import lists from './lists';
import providers from './providers';
import { verifyAdminToken } from '../../middlewares/auth';
const router = routerx();

router.use('/casinos', verifyAdminToken, casinos);
router.use('/lists', verifyAdminToken, lists);
router.use('/providers', verifyAdminToken, providers);

export default router;
