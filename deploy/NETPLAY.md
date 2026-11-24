# Netplay 2 nguoi - cau hinh

## Frontend

App Retro hien dung EmulatorJS nightly va netplay client. Cau hinh duoc doc tu:

- `window.KM_NETPLAY_SERVER` hoac `localStorage.km_netplay_server`
- `window.KM_NETPLAY_RELAY` hoac `localStorage.km_netplay_relay`

Mac dinh signaling server la `https://netplay.emulatorjs.org`. Neu server do khong kha dung, can tu host EmulatorJS-Netplay.

## Signaling server

Dung repo `EmulatorJS/EmulatorJS-Netplay` (nhanh `rust`):

```bash
git clone https://github.com/EmulatorJS/EmulatorJS-Netplay --branch rust
cd EmulatorJS-Netplay
cargo run
```

Chay sau HTTPS reverse proxy, sau do dat URL vao `KM_NETPLAY_SERVER`.

## ROM relay (host gui ROM)

Chay:

```bash
python server/rom_relay.py
```

Dat URL vao `KM_NETPLAY_RELAY`, vi du `https://relay.example.com`.

Render static site chi host frontend. Signaling va ROM relay phai la backend rieng (Render Web Service hoac VPS).
PY