import routerx from 'express-promise-router';
import users from './users';
import casinos from './casinos';
import payments from './payments';
import jackpot from './jackpot';
const router = routerx();
router.use('/users', users);
router.use('/casinos', casinos);
router.use('/payments', payments);
router.use('/jackpot', jackpot);

export default router;
