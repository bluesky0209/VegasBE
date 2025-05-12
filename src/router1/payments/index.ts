import routerx from 'express-promise-router';
import payments from './payments';
import { verifyCashierToken } from '../../middlewares/auth';

const router = routerx();

router.use('/', verifyCashierToken, payments);

export default router;
