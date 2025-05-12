import routerx from 'express-promise-router';
import lists from './lists';
import providers from './providers';
import history from './history';
import { verifyCashierToken } from '../../middlewares/auth';
const router = routerx();

router.use('/history', verifyCashierToken, history);
router.use('/lists', verifyCashierToken, lists);
router.use('/providers', verifyCashierToken, providers);

export default router;
