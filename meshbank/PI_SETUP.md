# Raspberry Pi Setup Guide for MeshBank

This guide walks you through setting up a Raspberry Pi to host the MeshBank project, making it accessible on an offline, localized WiFi network.

## 1. Prerequisites
- A Raspberry Pi (3B+, 4, or 5 recommended)
- A fresh installation of **Raspberry Pi OS** (Bullseye or later)
- An internet connection (for the initial setup only)

## 2. Install Required Dependencies
Connect to the Pi via SSH or terminal and update the system, then install Python 3, pip, and network tools:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-pip python3-venv hostapd dnsmasq nginx
```

## 3. Clone and Setup MeshBank
Clone the MeshBank project to the Pi (if you haven't transferred it already) and install the python dependencies.

```bash
cd /home/pi
# If copying via USB/SCP, place the project in a 'meshbank' folder
cd meshbank

# Create a virtual environment
python3 -m venv venv
source venv/bin/activate

# Install requirements
pip install -r requirements.txt
```

## 4. Setting up the Offline Wi-Fi Hotspot
MeshBank operates best entirely offline by broadcasting its own Wi-Fi network that users connect to. We'll use `hostapd` for broadcasting the Wi-Fi network and `dnsmasq` for DHCP/DNS.

### Configure Static IP
Edit `/etc/dhcpcd.conf` to give the wireless interface a static IP address:

```bash
sudo nano /etc/dhcpcd.conf
```
Add the following to the bottom of the file:
```text
interface wlan0
    static ip_address=192.168.4.1/24
    nohook wpa_supplicant
```

### Configure DHCP/DNS (dnsmasq)
Edit the dnsmasq configuration:
```bash
sudo mv /etc/dnsmasq.conf /etc/dnsmasq.conf.orig
sudo nano /etc/dnsmasq.conf
```
Add these lines:
```text
interface=wlan0
dhcp-range=192.168.4.2,192.168.4.50,255.255.255.0,24h
address=/#/192.168.4.1
```
*(The `address=/#/192.168.4.1` line catches all DNS queries and routes them to the Pi, creating a captive portal effect).*

### Configure the Access Point (hostapd)
Create the hostapd config file:
```bash
sudo nano /etc/hostapd/hostapd.conf
```
Add the following details (Change the `ssid` or `wpa_passphrase` if you like):
```text
interface=wlan0
driver=nl80211
ssid=MeshBank_Network
hw_mode=g
channel=7
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0
wpa=2
wpa_passphrase=meshbank123
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP
```

Tell the system to use this configuration file:
```bash
sudo nano /etc/default/hostapd
```
Find the line `#DAEMON_CONF=""` and replace it with:
```text
DAEMON_CONF="/etc/hostapd/hostapd.conf"
```

## 5. Enable the Services
Reboot the Pi to apply the static IP and network configurations:
```bash
sudo systemctl unmask hostapd
sudo systemctl enable hostapd
sudo systemctl enable dnsmasq
sudo reboot
```

## 6. Running MeshBank as a Background Service
To ensure MeshBank runs continuously when the Pi is turned on, set it up as a systemd service.

```bash
sudo nano /etc/systemd/system/meshbank.service
```

Add the following (assuming the repo is in `/home/pi/meshbank`):
```ini
[Unit]
Description=MeshBank Flask Server
After=network.target hostapd.service

[Service]
User=pi
WorkingDirectory=/home/pi/meshbank/backend
ExecStart=/home/pi/meshbank/venv/bin/python app.py
Restart=always

[Install]
WantedBy=multi-user.target
```

Enable and start the service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable meshbank
sudo systemctl start meshbank
```

## 7. Connect and Use
Your Raspberry Pi is now broadcasting **MeshBank_Network**.
1. Connect any smartphone or laptop to **MeshBank_Network** (Password: `meshbank123`).
2. Open a browser and navigate to **http://192.168.4.1:5000**.
3. You are now using the full MeshBank offline banking and POS system!
