import routerx from 'express-promise-router';
import skyxspin from "./skyxspin";
import { V, Validator } from '../../middlewares/validation';
import { checkUser, verifyToken } from '../../middlewares/auth';
import { getCasinoGamesListByCategory, getCasinoGamesLists, getCasinoProviders } from '../../controllers/casinos';
import { deleteMany } from '../../controllers/casinos/casinos';
import { getGameList, createBankGroup, createSession, createDemo, setPlayer, closeSession } from '../../controllers/casinos/api';
import { getSeamless } from "../../controllers/casinos/seamless";
import { launchGame } from '../../controllers/casinos/skyxspin';

const router = routerx();
//provider
router.post('/get-gamelist', getGameList);
router.post('/create-bankgroup', createBankGroup);
router.post('/create-demo', createDemo);

router.post('/get-gamelists', getCasinoGamesLists);

router.post('/get-gamelistsbycategory', getCasinoGamesListByCategory);
router.post('/get-providers', getCasinoProviders)
router.post('/createSession', async (req, res) => {
    const { provider } = req.body;
    if (provider === 'skyxspin') {
        launchGame(req, res);
    } else {
        createSession(req, res);
    }
})
router.post('/closeSession', closeSession)
router.post('/set-player', setPlayer)
//callback
router.post('/seamless', getSeamless)
router.post('/skyxspin', async (req, res, next) => {
    const { AppID, AppSecret } = req.body;
    if (AppID === process.env.SKYXSPIN_Appid && AppSecret === process.env.AppSecret) {
        next();
    } else {
        return res.json({
            code: 1,
            error: "wrong App information"
        });
    }
}, skyxspin)

router.post('/delete', deleteMany)

export default router;
