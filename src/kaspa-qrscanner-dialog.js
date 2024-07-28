import { i18n } from './flow-ux.js';
import {
	html, css, AnumaDialog, askForPassword, ANUM,
	formatForMachine, formatForHuman
} from './anuma-dialog.js';

class AnumaQRScannerDialog extends AnumaDialog{
	static get properties(){
		return {
			value:{type:String}
		}
	}
	static get styles(){
		return [AnumaDialog.styles, css`
			.container{
				width:100%;height:100%;padding:0px;
				max-height:var(--anuma-dialog-container-max-height, 620px);
			}
			flow-t9{width:215px;margin:auto;display:block;}
			.body-box{align-items:flex-start;}
			.buttons {display:flex;flex-direction:column;align-items:center;}

		`]
	}
	constructor(){
		super();
		this.stopped = true;
		window.showQRScanner = (args, callback)=>{
			this.open(args, callback)
		}
	}
	renderHeading({estimating}){
		return html`${this.renderBackBtn()} ${this.heading}`
	}
	renderBody(){
		let value = this.value || '';
		let debug = this.debug;
		let {inputLabel='Scan result'} = this;
		return html`
		<flow-qrcode-scanner qrcode="${this.value||''}" _hidecode ?debug=${debug}
			@changed="${this.onQRChange}"></flow-qrcode-scanner>
		<!--flow-input class="full-width_" clear-btn value="${value}"
			label="${inputLabel}" readonly @changed=${this.onInputChange}>
		</flow-input-->
		<div class="error">${this.errorMessage}</div>
		<div class="buttons">
			<flow-btn class="primary" 
				@click="${this.sendBack}" i18n> Close </flow-btn>
		</div>
		`;
	}
	stopQRScanning(){
		let scanner = this.qS("flow-qrcode-scanner");
		scanner.stop();
		this.stopped = true;
	}
	startScanning(){
		let scanner = this.qS("flow-qrcode-scanner");
		scanner.start();
		this.stopped = false;
	}
	sendBack(e){
		this.sendValueBack();
	}
	sendValueBack(){
		this.callback({value:this.value, dialog:this})
	}
	onInputChange(e){
		let value = e.detail.value;
		this.setValue(value);
	}
	onQRChange(e){
		let value = e.detail.code;
		this.setValue(value);
	}
	async setValue(value){
		let isValid = !!value;
		this.value = value;
		this.setError("")
		if(value && this.isAddressQuery){
			isValid = await this.wallet.isValidAddress(value)
			if(!isValid)
				this.setError(i18n.t("Invalid Address"))
		}
		this.isValid = isValid;
		if(isValid)
			this.sendValueBack();
	}
	open(args, callback){
		this.callback = callback;
		this.args = args;
		this.value = args.value||'';
		this.heading = args.title||args.heading||i18n.t('Scan QR code');
		this.inputLabel = args.inputLabel||i18n.t('Scan result');
		this.isAddressQuery = !!args.isAddressQuery;
		this.wallet = args.wallet
		this.show();
		this.startScanning();
	}
	_hide(skipHistory=false){
		this.stopQRScanning();
		super._hide(skipHistory);
	}
    cancel(){
    	this.hide();
    }
}

AnumaQRScannerDialog.define("anuma-qrscanner-dialog");
