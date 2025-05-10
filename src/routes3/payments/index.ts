import routerx from 'express-promise-router';
import payments from './payments';
import { verifyAdminToken } from '../../middlewares/auth';

const router = routerx();

router.use('/', verifyAdminToken, payments);

export default router;
