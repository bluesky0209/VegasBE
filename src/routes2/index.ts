import routerx from 'express-promise-router';
import users from './users';
import casinos from './casinos'

const router = routerx();
router.use('/users', users);
router.use('/casinos', (req, res, next) => {
    console.log('Casino route request:', req.method, req.url, req.body);
    casinos(req, res, next);
});

export default router;
