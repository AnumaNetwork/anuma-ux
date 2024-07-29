export * from './flow-ux.js';

import {AnumaWalletDesktop} from './anuma-wallet-desktop.js';
import {AnumaWalletMobile, isMobile, dontInitiatedComponent} from './anuma-wallet-mobile.js';

if(isMobile)
	document.body.classList.add('is-mobile');
export {isMobile}

export const AnumaWallet = isMobile ? AnumaWalletMobile : AnumaWalletDesktop;

if(!dontInitiatedComponent)
	AnumaWallet.define("anuma-wallet");
