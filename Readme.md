## About The Project

Effortlessly monitor the online status of users on your Teamspeak Server right from your Elgato Streamdeck.  
This project utilizes the Teamspeak Query API, requiring specific server credentials.  
With this tool, you can gain insights into connected users without the need to join the server.
Additionally, when connected, it provides a real-time display of all clients connected to the channel.

## Getting Started

1. Create a `.env` file by copying the provided example: `cp .env.example .env`.
2. Fill in the server query credentials in the newly created `.env` file.

## Key Features

* **User Status Display:**
  * view online clients along with their status (AFK, Mute, etc.).
  * Access this information even without being actively connected to the server.

* **Filter client based on your Channel**
* **Idle time of clients**

## Raspberry Pi (Linux)

1. Configure udev rules
   1. check the Id of your device with `lsusb` (example: `Bus 001 Device 003: ID 0fd9:0090 Elgato Systems GmbH`)
   2. add rule file: `sudo nano /etc/udev/rules.d/99-streamdeck.rules`
   3. add `SUBSYSTEM=="usb", ATTRS{idVendor}=="0fd9", ATTRS{idProduct}=="0090", MODE="0664", GROUP="plugdev"` (you might adapt the idProduct based of the output from `lsusb`)
   4. reload rules `sudo udevadm trigger`
2. default font might not be available (replace with font on system or install font)

## Roadmap

- [x] Extend support for Raspberry Pi.
- [ ] To be determined (tbd).
