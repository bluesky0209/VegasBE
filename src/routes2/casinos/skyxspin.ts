import routerx from 'express-promise-router';
import { skyTransfer, skyBalance } from '../../controllers/casinos/seamless';

const router = routerx();

router.post('/Cash/Get', skyBalance);
router.post('/Cash/TransferInOut', skyTransfer);

export default router;