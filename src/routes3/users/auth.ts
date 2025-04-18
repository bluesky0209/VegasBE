import routerx from 'express-promise-router';
import { Validator, V } from '../../middlewares/validation';
import { checkUser, verifyToken } from '../../middlewares/auth';
import {
    changePassword,
    signin,
    signup,
    signout,
    info,
    passwordReset,
} from '../../controllers/users';
const router = routerx();

router.post('/signin', V.body(Validator.Users.Auth.Signin), signin);
router.post('/signup', V.body(Validator.Users.Auth.Signup), signup);
router.post('/signout', V.body(Validator.UserId), signout);

router.post('/r-password', V.body(Validator.Users.Auth.PasswordReset), passwordReset);
router.post('/c-password', V.body(Validator.Users.Auth.ChangePassword), verifyToken, checkUser, changePassword);

router.post('/info', V.body(Validator.Users.Auth.Info), verifyToken, checkUser, info);

export default router;
