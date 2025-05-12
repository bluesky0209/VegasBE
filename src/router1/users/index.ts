import routerx from 'express-promise-router';
import cashier from './cashier';
import history from './history';
import session from './session';
import permission from './permission';
import users from './users';
import { verifyCashierToken } from '../../middlewares/auth';
const router = routerx();

router.use('/', users);
router.use('/cashier', cashier);
router.use('/permission', verifyCashierToken, permission);
router.use('/session', verifyCashierToken, session);
router.use('/history', verifyCashierToken, history);

export default router;
