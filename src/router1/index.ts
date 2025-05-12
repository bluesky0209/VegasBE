import routerx from 'express-promise-router';
import users from './users';
import casinos from './casinos';
import payments from './payments';

const router = routerx();
router.use('/users', users);
router.use('/casinos', casinos);
router.use('/payments', payments);

export default router;
