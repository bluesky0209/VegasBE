import routerx from 'express-promise-router';
import users from './users';
import casinos from './casinos';

const router = routerx();
router.use('/users', users);
router.use('/casinos', casinos);

export default router;
