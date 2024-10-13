import {listStreamDecks} from "@elgato-stream-deck/node";
import {logger} from "~/utils/logger";
/*
logger.info('RAW HID')
for (const dev of HID.devices()) {
  logger.info(dev)
}*/

logger.info('StreamDecks:')

listStreamDecks().then((devs) => {
    for (const dev of devs) {
        logger.info(dev)
    }
})
