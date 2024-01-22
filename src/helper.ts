import pWaitFor from "p-wait-for";
import isOnline from "is-online";

export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const waitForNetwork = async () => {
  // only useful if started on a raspberry pi
  // I can happen that the script started before network was available
  console.log("waiting on network...")
  await pWaitFor(isOnline, {timeout: 20 * 1000})
  console.log("waiting on network done")
}
