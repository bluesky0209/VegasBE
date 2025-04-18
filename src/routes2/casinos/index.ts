import routerx from 'express-promise-router';
import { V, Validator } from '../../middlewares/validation';
import { checkUser, verifyToken } from '../../middlewares/auth';
import { getCasinoGamesDetail, getCasinoGamesListByCategory, getCasinoGamesLists, getCasinoProviders } from '../../controllers/casinos';
import { deleteMany } from '../../controllers/casinos/casinos';
import { getGameList, createBankGroup, createSession } from '../../controllers/casinos/api';
import { getSeamless } from "../../controllers/casinos/seamless";

const router = routerx();
//provider
router.post('/get-gamelist', getGameList);
router.post('/create-bankgroup', createBankGroup);

router.post('/get-gamelists', getCasinoGamesLists);
router.post('/get-gamelistsbycategory', getCasinoGamesListByCategory);
router.post('/get-gamedetail', getCasinoGamesDetail)
router.post('/get-providers', getCasinoProviders)
router.post('/createSession', createSession)
//callback
router.post('/seamless', (req, res, next) => {
    console.log(req);
    return getSeamless(req, res);
})

router.post('/delete', deleteMany)

export default router;
