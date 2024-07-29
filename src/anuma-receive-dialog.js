import {html, css, AnumaDialog, T, i18n} from './anuma-dialog.js';

class AnumaWalletReceiveDialog extends AnumaDialog{
	static get properties(){
		return {
			qrdata:{type:String},
			address:{type:String}
		}
	}
	static get styles(){
		return [AnumaDialog.styles, 
		css`
			.container{max-height:400px}
			.buttons{justify-content:center;}
			flow-qrcode{width:170px;margin:auto}
			input.address{
				font-size:1px;padding:0px;margin:0px;border:0px;width:1px;height:1px;
				z-index:-1;position:absolute;opacity:0;
			}
			flow-input flow-btn{margin-bottom:0px;}
		`]
	}
	renderHeading(){
		return html`${T('RECEIVE')}`;
	}
	renderBody(){
		return html`
			<flow-qrcode data="${this.qrdata}" ntype="6"></flow-qrcode>
			<flow-input label="${T('Address')}" class="full-width" readonly 
				value="${this.address}" sufix-btn>
				<flow-btn slot="sufix" @click="${this.copyAddress}"
					title="${T('Copy to clipboard')}"><fa-icon icon="copy"></fa-icon></flow-btn>
			</flow-input>
			<input class="address" value="${this.address}">`;
	}
	renderButtons(){
		return html`<flow-btn @click="${this.hide}" i18n>CLOSE</flow-btn>`
	}
	open(args, callback){
		this.callback = callback;
		this.args = args;
		const {address} = args;
		this.qrdata = address;
		this.address = address;
		this.show();
	}
	copyAddress(){
		let input = this.renderRoot.querySelector("input.address");
		input.select();
		input.setSelectionRange(0, 99999)
		document.execCommand("copy");
		FlowDialog.alert(i18n.t("Address has been copied to the clipboard"), input.value);
	}
}

AnumaWalletReceiveDialog.define("anuma-wallet-receive-dialog");
