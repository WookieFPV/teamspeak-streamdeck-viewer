import {listStreamDecks} from "@elgato-stream-deck/node";
/*
console.log('RAW HID')
for (const dev of HID.devices()) {
  console.log(dev)
}*/

console.log('StreamDecks:')

listStreamDecks().then((devs) => {
    for (const dev of devs) {
        console.log(dev)
    }
})
