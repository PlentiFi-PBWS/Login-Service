# PlentiFi - XRPL Login Service



## Introduction
The Login Service enables account abstraction on the XRP Ledger by leveraging multi-signature features with correct weights. This allows a user to avoid saving their private key if they have two devices. 

## How It Works

### Signing Transactions
- **Primary Device**: When a user wants to sign a transaction, they can use their primary device.
- **Biometric Authentication**: The user authenticates to the login service using biometrics (WebAuthn signatures).
- **Security**: The login service alone cannot broadcast a transaction as its weight is less than the quorum.

### Offline Access
- **Redundancy**: If the login service goes offline, the user can still access their account using their two devices.

### Future Work
- **Dynamic Quorum Calculation**: We plan to develop a mathematical formula to determine the appropriate quorum and weights based on the number of user devices.

## Custom Account Abstraction
Since the XRP Ledger (XRPL) does not support smart contracts, we built a custom account abstraction mechanism for a seamless user experience. Using the XRPL's multi-signature feature, we created a robust authentication method to secure the user's account.

### Key Features
- **No Secrets to Store**: Users do not need to manage private keys.
- **Multi-Device Recovery**: Users can recover their account easily even if a device is lost.
- **WebAuthn Integration**: Part of the authentication method uses [WebAuthn](https://webauthn.io/) to identify the user, allowing the login service to approve transactions alongside the user's device.

## Multi-Signature Security
- **Controlled Signing**: The login service can be one of the signers, but it will never be able to broadcast a transaction without the user's approval.
- **Expandable**: Users can add more signers to their account, such as a computer, phone, tablet, etc.


## Repository Links
- **Official Organization**: [PlentiFi](https://github.com/PlentiFi-app)
- **Paris Blockchain Week Hackathon Project**: [PlentiFi PBWS Login Service](https://github.com/PlentiFi-PBWS/Login-Service)
